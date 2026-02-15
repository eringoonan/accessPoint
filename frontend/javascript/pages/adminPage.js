import { createController } from '../api/controllersApi.js';

// load function on page opening
document.addEventListener('DOMContentLoaded', function() {
  initializePlatformToggles();
  initializeFunctionalNeedToggles();
  initializeFormHandlers();
});

// Initialize platform detail toggles (check and uncheck box behaviour)
function initializePlatformToggles() {
  const platformCheckboxes = document.querySelectorAll('.platform-checkbox'); // select all platform checkboxes from html page
  
  // for each platform checkbox apply following
  platformCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() { // event listener for when box is checked
      const platformItem = this.closest('.platform-item');
      const toggleBtn = platformItem.querySelector('.details-toggle'); // define toggle button and details
      const detailsDiv = platformItem.querySelector('.platform-details');
      
      if (this.checked) {
        // enable toggle button when platform checked
        toggleBtn.disabled = false;
        toggleBtn.style.opacity = '1';
        toggleBtn.style.cursor = 'pointer';
        
        // explain details section
        detailsDiv.style.display = 'block';
        toggleBtn.classList.add('active');
        // switch button from plus to minus
        toggleBtn.querySelector('path').setAttribute('d', 'M4 8h8');
      } else {
        // disable details and hide additional info when it is unchecked
        toggleBtn.disabled = true;
        toggleBtn.style.opacity = '0.3';
        toggleBtn.style.cursor = 'not-allowed';
        detailsDiv.style.display = 'none';
        toggleBtn.classList.remove('active');
        // switch button back to a plus
        toggleBtn.querySelector('path').setAttribute('d', 'M8 4v8M4 8h8');
        
        // input is cleared when unchecked
        const input = detailsDiv.querySelector('input[type="text"]');
        const adapterCheckbox = detailsDiv.querySelector('input[type="checkbox"]');
        if (input) input.value = '';
        if (adapterCheckbox) adapterCheckbox.checked = false;
      }
    });
  });
}


// functional needs detail toggles (check and uncheck box behaviour)
function initializeFunctionalNeedToggles() {
  const needCheckboxes = document.querySelectorAll('.need-checkbox');
  
  // iterate for each check box
  needCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() { // change function
      const needItem = this.closest('.need-item');
      const toggleBtn = needItem.querySelector('.details-toggle');
      const detailsDiv = needItem.querySelector('.need-details');
      
      if (this.checked) {
        // enable toggle button
        toggleBtn.disabled = false;
        toggleBtn.style.opacity = '1';
        toggleBtn.style.cursor = 'pointer';
        
        // show details section
        detailsDiv.style.display = 'block';
        toggleBtn.classList.add('active');
        // icon to minus
        toggleBtn.querySelector('path').setAttribute('d', 'M4 8h8');
      } else {
        // hide details when unchecked
        toggleBtn.disabled = true;
        toggleBtn.style.opacity = '0.3';
        toggleBtn.style.cursor = 'not-allowed';
        detailsDiv.style.display = 'none';
        toggleBtn.classList.remove('active');
        // icon back to plus
        toggleBtn.querySelector('path').setAttribute('d', 'M8 4v8M4 8h8');
        
        // clear select when unchecked
        const select = detailsDiv.querySelector('select');
        if (select) select.value = '';
      }
    });
  });
}


// handle all toggle buttons (+/- button behaviour)
function initializeFormHandlers() {
  const allToggleBtns = document.querySelectorAll('.details-toggle');
  
  allToggleBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (this.disabled) return;
      
      const targetId = this.getAttribute('data-target');
      const detailsDiv = document.getElementById(targetId);
      
      if (detailsDiv.style.display === 'none' || !detailsDiv.style.display) {
        // Expand details
        detailsDiv.style.display = 'block';
        this.classList.add('active');
        // Change icon to minus
        this.querySelector('path').setAttribute('d', 'M4 8h8');
      } else {
        // Collapse details
        detailsDiv.style.display = 'none';
        this.classList.remove('active');
        // Change icon to plus
        this.querySelector('path').setAttribute('d', 'M8 4v8M4 8h8');
      }
    });
  });

  // Initialize form submission handlers
  initializeControllerFormSubmit();
}


// Handle controller form submission
function initializeControllerFormSubmit() {
  const controllerForm = document.getElementById('controller-form');
  
  if (controllerForm) {
    controllerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = collectControllerFormData();
      console.log('Controller form data:', formData);
      
      // Validate that at least one platform is selected
      if (formData.platforms.length === 0) {
        alert('Please select at least one platform');
        return;
      }
      
      // Validate that at least one functional need is selected
      if (formData.functional_needs.length === 0) {
        alert('Please select at least one functional need');
        return;
      }
      
      try {
        // Disable submit button, no double submit
        const submitBtn = controllerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        // call function from api
        const result = await createController(formData);
        
        if (result.success) {
          alert('Controller created successfully!');
          controllerForm.reset();
          // reset all expanded details
          document.querySelectorAll('.platform-details, .need-details').forEach(el => {
            el.style.display = 'none';
          });
          document.querySelectorAll('.details-toggle').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
            btn.classList.remove('active');
            btn.querySelector('path').setAttribute('d', 'M8 4v8M4 8h8');
          });
        } else {
          alert('Failed to create controller: ' + (result.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error creating controller:', error);
        
        // error message if not logged in
        if (error.message.includes('authentication token')) {
          alert('You are not logged in. Please log in and try again.');
          // error if not admin
        } else if (error.message.includes('Admin access required')) {
          alert('You do not have permission to add controllers. Admin access is required.');
          // error creating controller
        } else {
          alert('Error creating controller: ' + error.message);
        }
      } finally {
        // Re-enable submit button
        const submitBtn = controllerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Controller';
      }
    });
  }
}


 // Collect controller form data including junction table data
function collectControllerFormData() {
  const form = document.getElementById('controller-form');
  
  // Basic controller data
  const controllerData = {
    controller_name: form.querySelector('[name="controller_name"]').value,
    manufacturer: form.querySelector('[name="manufacturer"]').value,
    controller_type: form.querySelector('[name="controller_type"]').value,
    product_url: form.querySelector('[name="product_url"]').value || null,
    image_url: form.querySelector('[name="image_url"]').value || null,
    price: form.querySelector('[name="price"]').value || null,
    release_date: form.querySelector('[name="release_date"]').value || null,
  };
  
  // Collect platforms with details
  const platforms = [];
  const checkedPlatforms = form.querySelectorAll('[name="platforms"]:checked');
  checkedPlatforms.forEach(checkbox => {
    const platformValue = checkbox.value;
    const notesInput = form.querySelector(`[name="platform_notes_${platformValue}"]`);
    const adapterCheckbox = form.querySelector(`[name="platform_adapter_${platformValue}"]`);
    
    platforms.push({
      platform_name: platformValue,
      compatibility_notes: notesInput ? notesInput.value || null : null,
      requires_adapter: adapterCheckbox ? adapterCheckbox.checked : false
    });
  });
  
  // Collect functional needs with suitability
  const functional_needs = [];
  const checkedNeeds = form.querySelectorAll('[name="functional_needs"]:checked');
  checkedNeeds.forEach(checkbox => {
    const needValue = checkbox.value;
    const suitabilitySelect = form.querySelector(`[name="need_suitability_${needValue}"]`);
    
    functional_needs.push({
      need_name: needValue,
      suitability: suitabilitySelect ? suitabilitySelect.value || null : null
    });
  });
  
  return {
    controller: controllerData,
    platforms: platforms,
    functional_needs: functional_needs
  };
}
