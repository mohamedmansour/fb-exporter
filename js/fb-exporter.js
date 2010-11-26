var work_tab_id = 0;

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

    chrome.extension.sendRequest({relayInfoForFriend: friend}, function(response) {
      console.log("work tab received friend");
    });

  }, 3000, this);

  //$(iframe).remove();
}

function hideTopBanner() {
  $(".fb-exporter-top-banner").hide();
}

function startExportFriendData() {
  $(".fb-exporter-top-banner").show();

  // Remove existing iframes.
  $("iframe.fb-exporter").remove();

  // NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
  // following lines no longer work.  Namely, the fragile selector access being
  // done below to get at the corresponding fields might need to be updated.
  // Look at the actual FB page in question to make the right fixes.  PS: Who
  // wins the next 20 world series??
  var container = document.querySelectorAll("#editFriendsSearchContainer");
  $("li:visible > div > a", $(container)).each( function(idx, e) {
    var href = $(e).attr("href");

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
               .attr("class", "fb-exporter")
               .css("visibility", "hidden")
               .css("display", "none")
               ;

      $(document.body).prepend(iframe);
      $(iframe).load(friendInfoIframeLoaded);
    }, idx * 11000 + Math.random() * 1000);
  });
}

function switchToWorkerTab() {
  console.log("switchToWorkerTab");

  // The extension will handle the case if the worker tab already exists.
  chrome.extension.sendRequest({switchToWorkerTab: 1}, function(response) {
    console.log("returned from extension");
  });
}

function getFriendList() {
  console.log("getFriendList");
  // NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
  // following lines no longer work.  Namely, the fragile selector search being
  // done below might need to be tweaked, if the page is laid out differently.
  var container = document.querySelectorAll("#editFriendsSearchContainer");
  var ret = $('li:visible div > div > div a:not(:empty)', $(container)).map(function(idx, el) {
    console.log(el);
    return $(el).text();
  }).get();
  console.log("returning");
  console.log(ret);
  return ret;
}

function goToFriendPageAndStart() {
  // See if we are at the right page to start.  We need to be at the /friends/*
  // location, to get access to the list of friends.  Any other page won't do.
  //
  // To make sure the user wants to start exporting, we need to prompt her to
  // see if it's OK to go to the right page (she might have some input in an
  // input field that is not saved, etc).
  if (document.location.pathname.match("^/friends/edit") && document.location.search == 0) {
    switchToWorkerTab();
  } else {
    var redirect = document.createElement("div");
    $(redirect).css("background-color", "#f8f8ff")
               .css("color", "black")
               .css("border-radius", "10px")
               .css("border", "thick solid")
               .css("position", "absolute")
               .css("padding", "20pt")
               .css("font-size", "14pt")
               .css("width", "50%")
               .css("left", "25%")
               .css("right", "25%")
               .css("top", "20%")
               .attr("id", "fb-exporter-redirect")
               .html(
        "First, you need to go to <a href='http://www.facebook.com/friends/edit'>http://www.facebook.com/friends/edit</a>");

    $("a", $(redirect)).click( function() {
      $("#fb-exporter-redirect").remove();
      switchToWorkerTab();
    });

    $(redirect).append(
        $("<a/>").attr("href", "javascript:void(0);")
                 .css("position", "absolute")
                 .css("bottom", "0px")
                 .css("font-size", "10pt")
                 .css("right", "0px")
                 .css("padding", "5px")
                 .text("cancel")
                 .click(function() { $("#fb-exporter-redirect").remove(); }));

    $(document.body).append(redirect);
  }
}

$(document).ready(function() {
  console.log($("#pageNav  a:contains('Home')").parent());

  var dontCloseBanner = document.createElement("div");
  $(dontCloseBanner).css("background-color", "pink")
                    .css("color", "white")
                    .css("font-size", "18pt")
                    .css("text-align", "center")
                    .css("width", "100%")
                    .addClass("fb-exporter-top-banner")
                    .text("Don't close this window, please... exporting your data.  ")
                    .hide();
  // This first div is just to get the rest of the page content padded
  // downwards correctly.
  $(document.body).prepend($(dontCloseBanner));

  // This next dive is to keep the message at the top of the page.  Surely
  // there's a better way to do this, but meh.
  var followAlong = document.createElement("a");
  $(followAlong).text("Care to follow along?")
                .attr("href", "javascript:void(0);")
                .click(switchToWorkerTab);
  $(document.body).prepend(
      $(dontCloseBanner).clone()
                        .css("position", "fixed")
                        .css("z-index", "10000")
                        .css("top", "0px")
                        .append($(followAlong)));

  var exportFriendsLink = $("#pageNav a:contains('Home')").parent().clone();
  $("a", exportFriendsLink)
      .attr("href", "javascript:void(0);")
      .text("Export friends!")
      .css("color", "white")
      .click(goToFriendPageAndStart);
  console.log(exportFriendsLink);
  exportFriendsLink.appendTo($("#pageNav a:contains('Home')").parent());

  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      console.log(request);
      if (request.getFriendListFromContentScript) {
        work_tab_id = sender.tab.id;

        var friendNameList = getFriendList();
        sendResponse({friendNameList: friendNameList});
      }
      if (request.pissOffZuckerberg) {
        startExportFriendData();
      }

      if (request.hideTopBanner) {
        hideTopBanner();
      }
    });
  return;

});
