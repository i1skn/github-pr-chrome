var requestTimeout = 1000 * 2;  // 2 seconds

function getPullsUrl() {
  return "https://api.github.com/issues"
}

function getInboxCount(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();  // synchronously calls onreadystatechange
  }, requestTimeout);

  function handleSuccess(count) {
    localStorage.requestFailureCount = 0;
    window.clearTimeout(abortTimerId);
    if (onSuccess)
      onSuccess(count);
  }
  var invokedErrorCallback = false;
  function handleError() {
    ++localStorage.requestFailureCount;
    window.clearTimeout(abortTimerId);
    if (onError && !invokedErrorCallback)
      onError();
    invokedErrorCallback = true;
  }
  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;
      if (xhr.responseText != "" && xhr.status == 200) {
        var count = JSON.parse(xhr.responseText).filter(function(iss) {
          return iss.pull_request != undefined
        }).length

        handleSuccess(count)
        return
      }
      handleError();
    };
    xhr.onerror = function(error) {
      handleError();
    };
    xhr.open("GET", getPullsUrl(), true);
    chrome.storage.sync.get({
      token: ''
    }, function(items) {
      xhr.setRequestHeader("Authorization", "token "+items.token);
      xhr.send(null);
    });

  } catch(e) {
    console.error(e);
    handleError();
  }
}
