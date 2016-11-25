var oldChromeVersion = !chrome.runtime;
var i =1;
var pollIntervalMin = 1;  // 1 minute
var pollIntervalMax = 60;  // 1 hour

function updateIcon() {
  if (!localStorage.hasOwnProperty('ghPRCount')) {
    chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
    chrome.browserAction.setBadgeBackgroundColor({color:[208, 0, 24, 255]});
    chrome.browserAction.setBadgeText({
      text: localStorage.ghPRCount != "0" ? localStorage.ghPRCount : ""
    });
  }
}

function updateGHPRCount(count) {
  var changed = localStorage.ghPRCount != count;
  localStorage.ghPRCount = count;
  updateIcon();
}

function scheduleRequest() {
  console.log('scheduleRequest');
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, localStorage.requestFailureCount || 0);
  var multiplier = Math.max(randomness * exponent, 1);
  var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
  delay = Math.round(delay);
  console.log('Scheduling for: ' + delay);
  if (oldChromeVersion) {
    if (requestTimerId) {
      window.clearTimeout(requestTimerId);
    }
    requestTimerId = window.setTimeout(onAlarm, delay*60*1000);
  } else {
    console.log('Creating alarm');
    // Use a repeating alarm so that it fires again if there was a problem
    // setting the next alarm.
    chrome.alarms.create('refresh', {periodInMinutes: delay});
  }
}
// ajax stuff
function startRequest(params) {
  // Schedule request immediately. We want to be sure to reschedule, even in the
  // case where the extension process shuts down while this request is
  // outstanding.
  if (params && params.scheduleRequest) scheduleRequest();

  getInboxCount(
    function(count) {
      updateGHPRCount(count);
    },
    function() {
      delete localStorage.ghPRCount;
      updateIcon();
    }
  );
}

function onInit() {
  console.log('onInit');
  localStorage.requestFailureCount = 0;  // used for exponential backoff
  startRequest({scheduleRequest:true});
  if (!oldChromeVersion) {
    // TODO(mpcomplete): We should be able to remove this now, but leaving it
    // for a little while just to be sure the refresh alarm is working nicely.
    chrome.alarms.create('watchdog', {periodInMinutes:1});
  }
}

function onAlarm(alarm) {
  console.log('Got alarm', alarm);
  // |alarm| can be undefined because onAlarm also gets called from
  // window.setTimeout on old chrome versions.
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  } else {
    startRequest({scheduleRequest:true});
  }
}

function onWatchdog() {
  chrome.alarms.get('refresh', function(alarm) {
    if (alarm) {
      console.log('Refresh alarm exists. Yay.');
    } else {
      console.log('Refresh alarm doesn\'t exist!? ' +
                  'Refreshing now and rescheduling.');
      startRequest({scheduleRequest:true});
    }
  });
}

if (oldChromeVersion) {
  updateIcon();
  onInit();
} else {
  chrome.runtime.onInstalled.addListener(onInit);
  chrome.alarms.onAlarm.addListener(onAlarm);
}

function isPullsUrl(url) {
  // Return whether the URL starts with the Gmail prefix.
  console.log(url)
  return url == "https://github.com/pulls/assigned";
}

function goToPulls() {
  if (localStorage.requestFailureCount == 0) {
    console.log('Going to pull requests...');
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
      for (var i = 0, tab; tab = tabs[i]; i++) {
        if (tab.url && isPullsUrl(tab.url)) {
          console.log('Found Pull request tab: ' + tab.url + '. ' +
                      'Focusing and refreshing count...');
          chrome.tabs.update(tab.id, {selected: true});
          startRequest({scheduleRequest:false});
          return;
        }
      }
      console.log('Could not find Pull request tab. Creating one...');
      chrome.tabs.create({url: "https://github.com/pulls/assigned"});
    });
  } else {
    chrome.runtime.openOptionsPage()
  }
}

chrome.browserAction.onClicked.addListener(goToPulls);

if (chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(function() {
    console.log('Starting browser... updating icon.');
    startRequest({scheduleRequest:false});
    updateIcon();
  });
} else {
  // This hack is needed because Chrome 22 does not persist browserAction icon
  // state, and also doesn't expose onStartup. So the icon always starts out in
  // wrong state. We don't actually use onStartup except as a clue that we're
  // in a version of Chrome that has this problem.
  chrome.windows.onCreated.addListener(function() {
    console.log('Window created... updating icon.');
    startRequest({scheduleRequest:false});
    updateIcon();
  });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  startRequest({scheduleRequest:false});
});
