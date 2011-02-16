// Polling time.
var PROFILE_POLL_DELAY=2000;

// Communicate to both worlds, extension and website.
var exportEvent = document.createEvent('Event');
exportEvent.initEvent('friendExported', true, true);

// Just draw the export friends link on the top next to the other links.
renderExportFriendsLink();

// Listen on extension requests.
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.facebookError) {
    // Reload the content script so that the script will stop. Better than
    // managing all the spawned timers.
    window.location.reload(); 
  }
  else if (request.clearCache) {
    cachedMap = {};
  }
  else if(request.retrieveFriendsMap) {
    exportFacebookContacts();
  }
});

// Listen on the real DOM requests to check if friend has been exported.
window.addEventListener('friendExported', function() {
  // Save the map to this content script world, so our extension can read it.
  var transferDOM = $('#fb-transfer-dom-area');
  var friendsMap = JSON.parse(transferDOM.text());

  // For testing, lets just view 2 users.
  if (0) {
    var i = 0;
    var testMap = {};
    $.each(friendsMap, function(key, value) {
      if (i == 2) {
        return false;
      }
      testMap[key] = value;
      i++;
    });
    delete friendsMap;
    friendsMap = testMap;
  }
  // Clean up since we no longer need this.
  $(transferDOM).remove();
  $('#fb-inject-area').remove();
  
  // Count the number of friends.
  var i = 0;
  $.each(friendsMap, function(key, value) {
    i++;
  });
    
  // Tell the worker tab that we are set!
  chrome.extension.sendRequest({friendListReceived: friendsMap, count: i}, 
    function(response) {
      // Lets start the process! Super!
    }
  );
});
  
/**
 * Switches back to the worker tab where you can see all your friends being
 * processed.
 */
function switchToWorkerTab() {
  // The extension will handle the case if the worker tab already exists.
  chrome.extension.sendRequest({switchToWorkerTab: 1});
}

/**
 * Creates a custom Facebook lookalike dialog. 
 * @param {Object} data A map with the following keys:
 *                      - id: The ID for this dialog.
 *                      - title: The title the appears on the header.
 *                      - message: The description of the dialog, appears middle.
 *                      - yes_text: The text for the yes button.
 *                      - yes_callback: The callback when yes clicked.
 *                      - cancel_callback: The callback when cancel clicked.
 * @returns {HTMLElement} The DOM of the dialog returned.
 */
function createFacebookDialog(data) {
   // Creates the confirm component.
   var lblConfirm = $('<label class="uiButton uiButtonLarge uiButtonConfirm">');   
   $('<input>', {
      type: 'button',
      val: data.yes_text,
      click: data.yes_callback
   }).appendTo(lblConfirm);
   
   // Creates the cancel component.
   var lblCancel = $('<label class="uiButton uiButtonLarge">');
   $('<input>', {
      type: 'button',
      val: 'Cancel',
      click: data.cancel_callback
   }).appendTo(lblCancel);
   
   // Wrap the buttons to a container.
   var dialogButtons = $('<div class="dialog_buttons clearfix">');
   lblConfirm.appendTo(dialogButtons);
   lblCancel.appendTo(dialogButtons);
   
   // Main contents for the dialog description.
   var dialogContent = $('<div class="dialog_content">');
   $('<div class="dialog_body">' +
     '  <form id="report_form" onsubmit="return false;">' +
     '    <div class="pam uiBoxWhite noborder">' +
     '      <div class="pbm">' +
     '        ' + data.message +
     '      </div>' +
     '    </div>' +
     '  </form>' +
     '</div>').appendTo(dialogContent);
   dialogButtons.appendTo(dialogContent);
   
   // Add the title to the the dialog and the contents as well.
   var dialog = document.createElement('div');
   $(dialog).addClass('pop_container_advanced')
            .attr('id', data.id)
            .css('position', 'absolute')
            .css("left", "25%")
            .css("right", "25%")
            .css("top", "20%")
            .css("zIndex", "999999");
   var dialogPopup = $('<div class="pop_content" id="pop_content">');
   $('<h2 class="dialog_title"><span>' + data.title + '</span></h2>').appendTo(dialogPopup);
   dialogContent.appendTo(dialogPopup);
   dialogPopup.appendTo(dialog);
   return dialog;
}

/**
 * To transport JavaScript data from Facebook, it is faster and better to transfer
 * the internal map Facebook maintains. To do that, we create a transfer dom area
 * to the page so we dump the FriendSearchPane and then store it in the background
 * page right afterwards.
 */
function exportFacebookContacts() {
  // JS script injection to the facebook's World.
  var postFriendMap = function() {
    // Use events to notify the content script. Replicate the event the content
    // script has, so we can pass this event to that world.
    var exportEvent = document.createEvent('Event');
    exportEvent.initEvent('friendExported', true, true);
    
    // Create a transfer node DOM, since that is the only way two worlds can
    // communicate with each other.
    var transferDOM = document.getElementById('fb-transfer-dom-area');
    transferDOM.innerText = JSON.stringify(FriendSearchPane._data);
    
    // Inform our content script that we have received the object from Facebook.
    window.dispatchEvent(exportEvent);
  };
  
  // Create a dummy textarea DOM.
  var transferDOM = document.createElement('div');
  $(transferDOM).attr('id', 'fb-transfer-dom-area')
                .hide()
                .appendTo($(document.body));
  
  // Start injecting the JS script.
  var script = document.createElement('script');
  script.setAttribute('id', 'fb-inject-area');
  script.appendChild(document.createTextNode('(' + postFriendMap + ')();'));
  document.body.appendChild(script);  
}
  
/**
 * To make sure the user wants to start exporting, we need to prompt her to
 * see if it's OK to go to the right page (she might have some input in an
 * input field that is not saved, etc).
 */
function goToFriendPageAndStart() {
  // See if we are at the right page to start.  We need to be at the /friends/*
  // location, to get access to the list of friends. Any other page won't do.
  if (document.location.pathname.match('^/friends/edit') && document.location.search == 0) {
    // Do nothing now, the worker tab will manage the state since everything 
    // is asynchronous, we will let events handle the state.
    switchToWorkerTab();
  }
  else {     
    $(document.body).append(createFacebookDialog({
      id: 'fb-exporter-redirect',
      title: 'Redirection needed',
      message: 'First, you need to go to your friends page, do you want us to redirect you to it?',
      yes_text: 'Redirect now',
      yes_callback: (function() {
        $('#fb-exporter-redirect').remove();
        switchToWorkerTab();
        window.location = 'http://www.facebook.com/friends/edit';
      }),
      cancel_callback: (function() {
        $('#fb-exporter-redirect').remove();
      })
    }));
  }
}

/**
 * Adds a export friends link to the top of the worker tab.
 */
function renderExportFriendsLink() {
  // Paint the Export friends to the top of the page.
  var exportFriendsLink = $('#pageNav a:contains("Home")').parent().clone();
  $('a', exportFriendsLink)
      .attr('id', 'export-friends-link')
      .attr('href', 'javascript:void(0);')
      .text('Export friends!')
      .css('color', 'white')
      .click(goToFriendPageAndStart);
  exportFriendsLink.appendTo($('#pageNav a:contains("Home")').parent());
}