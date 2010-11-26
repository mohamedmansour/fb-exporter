// Routines to handle csv exporting.

function csv_DoExport(requestedFriendsToImport) {
  var csv_header = ["Name", "Email 1", "Email 2", "Email 3",
                    "IM 1", "IM 2", "IM 3",
                    "Website 1", "Website 2", "Website 3",
                    "Website Facebook"
                    ];

  var csv_rows = [];

  $.each(requestedFriendsToImport, function(key, friend) {
    csv_row = [];
    csv_row.push(friend.name);

    for (i = 0; i < 3; i++ ){
      if (friend.email[i]) {
        csv_row.push(friend.email[i]);
      } else {
        csv_row.push("");
      }
    }

    for (i = 0; i < 3; i++ ){
      if (friend.aims[i]) {
        csv_row.push(friend.aims[i]);
      } else {
        csv_row.push("");
      }
    }

    for (i = 0; i < 3; i++ ){
      if (friend.websites[i]) {
        csv_row.push(friend.websites[i]);
      } else {
        csv_row.push("");
      }
    }

    if (friend.fb) {
      csv_row.push(friend.fb);
    } else {
      csv_row.push("");
    }

    csv_rows.push(csv_row);

    chrome.tabs.sendRequest(work_tab_id,
        {finishedProcessingFriend: true,
         friend: friend,
         success: 1,
         message: "Added to CSV!"});
  });

  var s = csv_header.join(",") + "\n";

  for(i in csv_rows) {
    s += csv_rows[i].join(",") + "\n";
  }

  return s;
}
