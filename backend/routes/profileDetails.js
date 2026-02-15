const express = require('express');
const db = require('../db'); 
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get('/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const sql = `
        SELECT 
            uc.user_controller_id,
            uc.user_id,
            uc.controller_id,
            uc.save_date,
            c.*,
            GROUP_CONCAT(DISTINCT p.platform_name) as platforms,
            GROUP_CONCAT(DISTINCT fn.need_name) as needs
        FROM user_controllers uc
        LEFT JOIN controllers c 
            ON uc.controller_id = c.controller_id

        LEFT JOIN controller_platforms cp 
            ON c.controller_id = cp.controller_id
            AND cp.compatibility_notes = 'native support'

        LEFT JOIN platforms p 
            ON cp.platform_id = p.platform_id

        LEFT JOIN controller_needs cn 
            ON c.controller_id = cn.controller_id
        LEFT JOIN functional_needs fn 
            ON cn.need_id = fn.need_id

        WHERE uc.user_id = ?
        GROUP BY c.controller_id, uc.user_controller_id, uc.save_date
        ORDER BY uc.save_date DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if(err) {
            console.error('DB error fetching profile details:', err);
            return res.status(500).json({ error: 'Failed to fetch details' });
        }

        // Process results to convert comma-separated strings to arrays
        const processedResults = results.map(controller => ({
            ...controller,
            platforms: controller.platforms ? controller.platforms.split(',') : [],
            needs: controller.needs ? controller.needs.split(',') : []
        }));

        res.status(200).json({ 
            controllers: processedResults,
            count: processedResults.length 
        });
    });
});

router.delete('/remove/:controllerId', authMiddleware, (req, res) => {
    const controllerId = req.params.controllerId;
    const userId = req.user.id; // Get user ID from JWT token (verified by authMiddleware)
    
    // First, verify that this controller belongs to this user
    const checkSql = 'SELECT * FROM user_controllers WHERE controller_id = ? AND user_id = ?';
    
    db.query(checkSql, [controllerId, userId], (err, results) => {
        if (err) {
            console.error('DB error checking controller ownership:', err);
            return res.status(500).json({ error: 'Failed to verify controller ownership' });
        }
        
        if (results.length === 0) {
            return res.status(403).json({ error: 'You do not have permission to remove this controller' });
        }
        
        // If we get here, the user owns this controller - proceed with deletion
        const deleteSql = 'DELETE FROM user_controllers WHERE controller_id = ? AND user_id = ?';
        
        db.query(deleteSql, [controllerId, userId], (err, result) => {
            if (err) {
                console.error('DB error removing controller:', err);
                return res.status(500).json({ error: 'Failed to remove controller' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Controller not found' });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Controller removed successfully',
                controllerId: controllerId
            });
        });
    });
});

module.exports = router;