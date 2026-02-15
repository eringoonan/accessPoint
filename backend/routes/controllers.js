// routes/controllers.js
const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();

console.log("controllers router loaded");

router.get('/', (req, res) => {
  const sql = `
    SELECT 
      c.*,

      GROUP_CONCAT(DISTINCT p.platform_name) AS platforms,
      GROUP_CONCAT(DISTINCT fn.need_name) AS needs

    FROM controllers c

    LEFT JOIN controller_platforms cp 
      ON c.controller_id = cp.controller_id
      AND cp.compatibility_notes = 'native support'

    LEFT JOIN platforms p 
      ON cp.platform_id = p.platform_id

    LEFT JOIN controller_needs cn 
      ON c.controller_id = cn.controller_id
    LEFT JOIN functional_needs fn 
      ON cn.need_id = fn.need_id

    GROUP BY c.controller_id
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('DB error fetching controllers:', err);
            return res.status(500).json({ error: 'Failed to fetch controllers' });
        }

        // Convert CSV strings into real arrays
        const formatted = results.map(row => ({
            ...row,
            platforms: row.platforms 
                ? row.platforms.split(',') 
                : [],
            needs: row.needs 
                ? row.needs.split(',') 
                : []
        }));

        res.json(formatted);
    });
});

router.post('/user-controllers', authMiddleware, (req, res) => {
  const { controller_id } = req.body;
  const user_id = req.user.id;

  if (!controller_id) {
    return res.status(400).json({ error: "controller_id is required" });
  }

  // Check if already saved
  const checkQuery = "SELECT * FROM user_controllers WHERE user_id = ? AND controller_id = ? LIMIT 1";
  
  db.query(
    checkQuery,
    [user_id, controller_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "DB error" });
      }
      
      if (results.length > 0) {
        return res.status(409).json({ error: "Controller already saved" });
      }

      // Insert new saved controller
      const insertQuery = "INSERT INTO user_controllers (user_id, controller_id, save_date) VALUES (?, ?, NOW())";
      
      db.query(
        insertQuery,
        [user_id, controller_id],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: "Failed to save controller" });
          }

          res.status(201).json({
            message: "Controller saved successfully",
            user_controller_id: result.insertId
          });
        }
      );
    }
  );
});

// route to add a controller to the db, and fill in related junction tables
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { controller, platforms, functional_needs } = req.body;
  
  console.log('Received create controller request:', { controller, platforms, functional_needs });
  
  // Validate required fields
  if (!controller || !controller.controller_name || !controller.manufacturer || !controller.controller_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required controller fields: controller_name, manufacturer, controller_type'
    });
  }

  if (!platforms || platforms.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one platform must be selected'
    });
  }

  if (!functional_needs || functional_needs.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one functional need must be selected'
    });
  }

  // Step 1: Insert the controller
  const insertControllerSql = `
    INSERT INTO controllers 
    (controller_name, manufacturer, controller_type, product_url, image_url, price, release_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const controllerValues = [
    controller.controller_name,
    controller.manufacturer,
    controller.controller_type,
    controller.product_url || null,
    controller.image_url || null,
    controller.price || null,
    controller.release_date || null
  ];

  db.query(insertControllerSql, controllerValues, (err, controllerResult) => {
    if (err) {
      console.error('Error inserting controller:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to create controller',
        error: err.message
      });
    }

    const controllerId = controllerResult.insertId;
    console.log('Controller created with ID:', controllerId);

    // Step 2: Insert platforms
    let platformsProcessed = 0;
    let platformErrors = [];

    platforms.forEach((platform, index) => {
      // First, get the platform_id
      db.query(
        'SELECT platform_id FROM platforms WHERE platform_name = ?',
        [platform.platform_name],
        (err, platformRows) => {
          if (err) {
            platformErrors.push(`Error finding platform ${platform.platform_name}: ${err.message}`);
            platformsProcessed++;
            checkIfDone();
            return;
          }

          if (platformRows.length === 0) {
            platformErrors.push(`Platform not found: ${platform.platform_name}`);
            platformsProcessed++;
            checkIfDone();
            return;
          }

          // Insert into controller_platforms
          const insertPlatformSql = `
            INSERT INTO controller_platforms 
            (controller_id, platform_id, compatibility_notes, requires_adapter)
            VALUES (?, ?, ?, ?)
          `;
          
          db.query(
            insertPlatformSql,
            [
              controllerId,
              platformRows[0].platform_id,
              platform.compatibility_notes || null,
              platform.requires_adapter ? 1 : 0
            ],
            (err) => {
              if (err) {
                platformErrors.push(`Error inserting platform ${platform.platform_name}: ${err.message}`);
              }
              platformsProcessed++;
              checkIfDone();
            }
          );
        }
      );
    });

    // Step 3: Insert functional needs
    let needsProcessed = 0;
    let needErrors = [];

    functional_needs.forEach((need) => {
      // First, get the need_id
      db.query(
        'SELECT need_id FROM functional_needs WHERE need_name = ?',
        [need.need_name],
        (err, needRows) => {
          if (err) {
            needErrors.push(`Error finding need ${need.need_name}: ${err.message}`);
            needsProcessed++;
            checkIfDone();
            return;
          }

          if (needRows.length === 0) {
            needErrors.push(`Functional need not found: ${need.need_name}`);
            needsProcessed++;
            checkIfDone();
            return;
          }

          // Insert into controller_needs
          const insertNeedSql = `
            INSERT INTO controller_needs 
            (controller_id, need_id, suitability)
            VALUES (?, ?, ?)
          `;
          
          db.query(
            insertNeedSql,
            [
              controllerId,
              needRows[0].need_id,
              need.suitability || null
            ],
            (err) => {
              if (err) {
                needErrors.push(`Error inserting need ${need.need_name}: ${err.message}`);
              }
              needsProcessed++;
              checkIfDone();
            }
          );
        }
      );
    });

    // Check if all async operations are done
    function checkIfDone() {
      if (platformsProcessed === platforms.length && needsProcessed === functional_needs.length) {
        // All done!
        if (platformErrors.length > 0 || needErrors.length > 0) {
          console.error('Errors during insert:', { platformErrors, needErrors });
          return res.status(500).json({
            success: false,
            message: 'Controller created but some relationships failed',
            controller_id: controllerId,
            errors: [...platformErrors, ...needErrors]
          });
        }

        console.log('Controller and all relationships created successfully');
        res.status(201).json({
          success: true,
          message: 'Controller created successfully',
          controller_id: controllerId
        });
      }
    }
  });
});

module.exports = router;