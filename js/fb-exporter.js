var friendsMap = {};

// Just draw the export friends link on the top next to the other links.
renderExportFriendsLink();

// Listen on extension requests.
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.startExportFriendData) {
    startExportFriendData();
  }
  else if (request.getFriendsMap) {
    sendResponse({data: friendsMap});
  }
});


function switchToWorkerTab() {
  // The extension will handle the case if the worker tab already exists.
  chrome.extension.sendRequest({switchToWorkerTab: 1}, function(response) {
    console.log('Returned from extension');
  });
}

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
    var textarea = document.getElementById('transfer-dom-area');
    textarea.value = JSON.stringify(FriendSearchPane._data);
  };
  
  // Create a dummy textarea DOM.
  var textarea = document.createElement('textarea');
  $(textarea).attr('id', 'transfer-dom-area')
             .hide()
             .appendTo($(document.body));
  
  // Start injecting the JS script.
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + postFriendMap + ')();'));
  document.body.appendChild(script);
  
  // Inform our world that we have received the friend map data.
  friendsMap = JSON.parse(textarea.value);
  
  // Clean up since we no longer need this.
  $(textarea).remove();
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
    exportFacebookContacts();
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



function friendInfoIframeLoaded() {
  console.log("iframe loaded " + this.src);
  
  var iframe = this;
  
  // We can't access the iframe elements directly, because they probably have
  // not loaded yet.  The contact information fields are appended dynamically.
  // Instead, we use setTimeout to give all the pagelets a chance to load.
  setTimeout(function(iframe) {
    var friend_name = $("#profile_name", $(iframe.contentDocument)).text();

    // NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
    // following lines no longer work.  Namely, the fragile selector access
    // being done below to get at the corresponding fields might need to be
    // updated.  Look at the actual FB page in question to make the right
    // fixes.  PS: Who wins the next 20 world series??
    //
    // To gather additional friend information, add the right selector here.
    var email = $("li", $("th.label:contains('Email')", $(iframe.contentDocument)).parent());
    var aims = $("td", $("th.label:contains('AIM')", $(iframe.contentDocument)).parent());
    var websites = $("li", $("th.label:contains('Website')", $(iframe.contentDocument)).parent());
    var fb = $("td", $("th.label:contains('Facebook')", $(iframe.contentDocument)).parent());
    var gtalks = $("td", $("th.label:contains('Google Talk')", $(iframe.contentDocument)).parent());

    console.log(friend_name);
    console.log("emails " + email.map(function() {
      return $(this).text();
    }).get());
    console.log(email.map(function() {
      return $(this).text();
    }).get());
    console.log("aims " + aims.map(function() {
      return $(this).text();
    }).get());

    console.log("websites " + websites.map(function() {
      return $(this).text();
    }).get());

    console.log("fb " + fb.text());
    console.log("gtalks " + gtalks.map(function() {
      return $(this).text();
    }).get());

    console.log("======================");

    var friend = {};
    friend.name = friend_name;
    friend.email = email.map(function() {
      return $(this).text();
    }).get();
    friend.aims = aims.map(function() {
      return $(this).text();
    }).get();

    friend.websites = websites.map(function() {
      return $(this).text();
    }).get();

    friend.fb = fb.text();
    friend.gtalks = gtalks.map(function() {
      return $(this).text();
    }).get();

    //chrome.extension.sendRequest({relayInfoForFriend: friend}, function(response) {
    //  console.log("work tab received friend");
    //});

  }, 3000, this);

  $(iframe).remove();
}

function startExportFriendData() {
  var i = 0;
  $.each(friendsMap, function(key, value) {
    var href = 'http://www.facebook.com' + value.path;
    if (href.match("\\?")) {
      href += "&v=info";
    } else {
      href += "?v=info";
    }

    console.log(href);

    // Delay load each friend.
    setTimeout(function() {
      var iframe = document.createElement("iframe");
      $(iframe).attr("src", href)
               .attr("class", "fb-exporter");

      $(document.body).prepend(iframe);
      $(iframe).load(friendInfoIframeLoaded);
    }, i * 11000 + Math.random() * 1000);
    
    i++;
  });
}