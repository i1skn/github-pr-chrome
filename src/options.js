// Saves options to chrome.storage
function save_options() {
  var errorBlock = document.getElementById('error');
  var token = document.getElementById('token').value;
  errorBlock.className = "error";
  chrome.storage.sync.set({
    token: token
  }, function() {
    getInboxCount(
      function() {
        var saveButton = document.getElementById('save');
        saveButton.textContent = 'Successfully saved!';
        setTimeout(function() {
          window.close()
        }, 1000);
      },
      function(e) {
        errorBlock.className += " show";
      }
    );
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    token: ''
  }, function(items) {
    document.getElementById('token').value = items.token;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
