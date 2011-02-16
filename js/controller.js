var bkg = chrome.extension.getBackgroundPage();
var total_visible_friends = 0;
var friends_remaining_count = 0;

/**
 * Send a request to the Facebook page and tell it to get the friends list. 
 * Keep the map stored there since we can guarantee to get it afterwards.
 * Asynchronous communication will not guarantee us to get it now.
 */
function fetchFriendList() {
  chrome.tabs.sendRequest(bkg.facebook_id,{ retrieveFriendsMap: 1});
}

/**
 * Render all my friends below. Display their profile pic and a link to their
 * profile page. As well, when hovered, show their name.
 * @param {number} count The number of friends.
 */
function renderFriendList(count) {
  $('#step1').hide();
  $('#friendlist').show();
  $('#step2').show();
  $('#remaining-friend-count').show();
  $('#start-crunching').attr('disabled', true);
  $('#start-crunching').text('checking cached friends, please wait ...');

  // Reset counter of processed  friends. This is just used to show how many
  // friends are showing.
  total_processed_friends = 0;
  
  var friendsMap = bkg.getFriendsMap();
  $.each(friendsMap, function(key, value) {
    bkg.db.getFriend(key, function(result) {
      total_processed_friends++;
      $('#remaining-friend-count').text(
        'Processsing ' + total_processed_friends + ' / ' + count + ' friends!'
      );
      
      // Create the list friend item, but first decide if its cached or not.
      var li = document.createElement('li');
      $(li).addClass('friend-row')
           .attr('id', key)
           .html('<img src="' + value.photo + '" title="' + value.text + '"/>' +
                 '<span>' + (result.status ? 'CACHED' : 'READY') + '</span>')
           .click(
             function() {
                chrome.tabs.create({url: 'http://facebook.com' + value.path });
             }
           );
      // When a friend is found, that means they are cached. Inform facebook.
      if (result.status) {
        $(li).addClass('cached');
        bkg.putFriendCache(result.data);
      }
      $('#friendlist').append(li);
      
      // The last friend finished processing.
      if (total_processed_friends == count) {
        $('#remaining-friend-count').text(count + ' friends!');
        $('#start-crunching').text('let\'s start!');
        $('#start-crunching').attr('disabled', false);
      }
    });
  });

  // Check if we have any friends.
  if (count == 0) {
    var li = document.createElement('li');
    $(li).addClass('friend-row')
         .text('Looks like you have no friends? Impossible! You probably need ' +
               'to pick a different network (see above).');
  }

  // Initialize the remaining count, used for step 3.
  friends_remaining_count = count;
}

/**
 * The main process to start the lengthy process. This will spawn an iframe
 * for every user so we can extract data from it.
 */
function startCrunching() {
  $('#step2').hide();
  $('#step3').show();

  $('#remaining-friend-count').text(friends_remaining_count + ' remaining');

  // Show pending for each element that was ready.
  $.each(document.querySelectorAll('#friendlist li span'), function(key, value) {
    if ($(value).text() == 'READY') {
      $(value).text('PENDING');
    }
  });
  
  // Start request, let the background page start the long long long process!
  chrome.tabs.sendRequest(bkg.facebook_id,
                          {startExportFriendData: 1});
}


/**
 * Delete all the cache from database so we can start over. 
 */
function deleteCache() {
  bkg.db.clear();
  $.each(document.querySelectorAll('#friendlist li.cached'),
      function(key, value) {
        $(value).removeClass('cached');
        $(value).find('span').text('READY');
      }
  );
  chrome.tabs.sendRequest(bkg.facebook_id, ({clearCache: true}));
}

/**
 * Friend information recieved that needs to be processed/
 * @param {object} friend An object that represents a single friend. Keys are:
 *                        - id: The unique id of the facebook user.
 *                        - name: The full name.
 *                        - email: A list of email addresses.
 *                        - aims: A list of AIM instant messengers.
 *                        - websites: A list of websites.
 *                        - fb: The unique facebook URL for the user.
 *                        - gtalks: Google Talk address.
 */
function gotInfoForFriend(friend) {
  var success = true;
  
  // If the email is empty
  if (friend.email.length == 1 && friend.email[0] == '') {
    success = false;
  }
  var item = $('#' + friend.id);
  item.find('span').text(success ? 'PROCESSED' : 'FAILED');
  item.removeClass('starting');
  item.addClass(success ? 'processed' : 'failed');
  
  var checkbox = document.createElement('input');
  $(checkbox).attr('type', 'checkbox')
             .attr('checked', '1')
             .attr('id', 'checkbox' + friend.id)
             .addClass('checkbox');
  item.prepend($(checkbox));

  // Attach the friend object to the list item, for later retrieval.
  item.data(friend);

  // Create a detailed view, for now disable this until we make a better UI,
  // perhaps a hover (card) that shows the persons extracted information.
  var detail_ul = document.createElement('ul');
  $(detail_ul).addClass('friend-detail');
  // item.append($(detail_ul));

  $.each(friend, function(key, value) {
    if (key == 'name') {
      // No need to show name, since it's part of the parent li.
      return;
    }

    if (value) {
      if ($.isArray(value)) {
        $.each(value, function(k, v) {
          var detail_li = document.createElement('li');
          $(detail_li).text(key + ': ' + v);
          $(detail_ul).append($(detail_li));
        });
      } else {
        var detail_li = document.createElement('li');
        $(detail_li).text(key + ': ' + value);
        $(detail_ul).append($(detail_li));
      }
    }
  });

  friends_remaining_count -= 1;

  $('#remaining-friend-count').text(
    'Processed ' + friend.name + ', ' +
    friends_remaining_count + ' remaining.'
  );

  if (friends_remaining_count == 0) {
    setupExportScreen();
  }
  
  return success;
}

function setupExportScreen() {
  // All of the friend info for the visible subset of friends has been
  // received.  Show specific export buttons now.
  $('#step3').hide();
  $('#step4').show();

  // Remove the ajax loading gif.
  $('#export-methods img').remove();

  //chrome.tabs.sendRequest(bkg.facebook_id,
  //                        {hideTopBanner: 1});

  $('#remaining-friend-count').hide();
}
/**
 * Setup a list of the visible, checked friends that we want to send to 
 * export.
 */
function setupAndStartExport(request) {
  // Only get the checked friends, disregard all others.
  var requested_friends = $('li.friend-row').map( function(idx, e) {
    // First, see if this element's checkbox is checked or not.
    if ($('.checkbox', e).attr('checked') != '1') {
      return null;
    }
    return $(e).data();
  }).get();

  // Reset the remaining friends counter, to take into effect the checked friends.
  friends_remaining_count = requested_friends.length;
  if (friends_remaining_count != 0) {
    $('#remaining-friend-count').show().text(
        friends_remaining_count + ' remaining');
  } else {
    // Remove the ajax loading gif, if there are no friends_remaining_count.
    alert('You don\'t have any friends selected!');
    $('#export-methods img').remove();
  }

  // Send a request to the background page, so that we can start the export
  // module process.
  request.requestedFriends = requested_friends;
  chrome.extension.sendRequest(request);
}

$(document).ready(function() {
  // Activate the Terms of Service. They must click it to continue.
  $('#tos').click( function() {
    if ($('#tos').attr('checked')) {
      $('.tos-guarded').attr('disabled', false);
    } else {
      $('.tos-guarded').attr('disabled', true);
    }
  });

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.gotInfoForFriend) {
      var response = gotInfoForFriend(request.gotInfoForFriend);
      sendResponse({OK: response});
    }
    else if (request.csvExportFinished) {
      var csv_popup = $("<div/>");
      $(csv_popup).attr("id", "csv-popup");

      var textarea = $("<textarea/>");
      $(textarea).text(request.csvExportFinished);

      var a = $("<a/>").attr("href", "javascript:void(0);")
                       .text("close")
                       .click(function() {
        $("#csv-popup").remove();
      });

      var info = $("<span/>").text("Here is your CSV.  Copy and save it somewhere safe.");

      $(csv_popup).append(info);
      $(csv_popup).append(a);
      $(csv_popup).append(textarea);

      $(document.body).append(csv_popup);
    }
    else if (request.finishedProcessingFriend) {
      // The export finished for this contact.  Update the list, based
      // on the success status, or show the error message.
      console.log('finishedProcessingFriend ', request.friend.name);
      console.log('finishedProcessingFriend ', request.success);
      console.log('finishedProcessingFriend ', request.message);

      var item = $('#' + request.friend.id);
      var status_text = request.success ? 'success' : 'failed';
      item.removeClass('starting');
      item.removeClass('processed');
      item.removeClass('cached');
      item.find('span').text(status_text.toUpperCase());
      item.addClass(status_text);
      
      friends_remaining_count -= 1;
      $('#remaining-friend-count').show().text(
          friends_remaining_count + ' remaining');

      if (friends_remaining_count == 0) {
        // Remove the ajax loading gif.
        $('#export-methods img').remove();

        //chrome.tabs.sendRequest(bkg.facebook_id,
        //                        {hideTopBanner: 1});
      }
    }
    else if (request.facebookError) {
      $('#note').show();
      setupExportScreen();
    }
    else if (request.friendExtractionStarted) {
      var item = $('#' + request.friendExtractionStarted);
      item.removeClass('processed');
      item.addClass('starting');
      item.find('span').text('STARTING');
    }
    else if (request.friendListReceived) {
      renderFriendList(request.count);
    }
  });


  $('.continue1').click(fetchFriendList);
  
  $('#start-crunching').click(startCrunching);
  
  $('#delete-cache').click(deleteCache);

  // Gmail exportation:
  $('#export-to-gmail').click(function() {
    $('#export-to-gmail').parent().prepend(
          $('#ajax-loader').clone().attr('id', '').show());

    setupAndStartExport({doGmailExport: 1});
  });

  // CSV exportation:
  $('#export-to-csv').click(function() {
    $('#export-to-csv').parent().prepend(
          $('#ajax-loader').clone().attr('id', '').show());

    setupAndStartExport({doCSVExport: 1});
  });
});
