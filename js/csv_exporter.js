/**
 * Routines to handle csv exporting.
 */
CSVExporter = function(friends) {
  this.friends = friends;
  this.header = ['Name', 'Email 1', 'Email 2', 'Email 3',
                  'Phone Mobile', 'Phone Other',
                  'IM 1', 'IM 2', 'IM 3',
                  'Website 1', 'Website 2', 'Website 3',
                  'Website Facebook'
                 ];
  this.dump = '';
};

/**
 * Start processing csv file.
 * @param {Function<Friend>} callback to fire after each friend processed.
 */
CSVExporter.prototype.process = function(callback) {
  var csv_rows = [];
  var i = 0;
  
  for (var j = 0; j < this.friends.length; j++) {
    var friend = this.friends[j];
    var csv_row = [];
    csv_row.push(friend.name);

    // Email parsing.
    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.email[i]);
    }
    
    // Phone.
    var phone1 = friend.phones[0];
    var phone2 = friend.phones[1];
    var mobile = null;
    var other = null;
    if (phone1) {
      if (Exporter.getPhoneType(phone1[1]) == 'mobile') {
        mobile = phone1[0];
      }
      else {
        other = phone1[0];
      }
    }
    if (phone2) {
      if (Exporter.getPhoneType(phone2[1]) == 'mobile') {
        mobile = phone2[0];
      }
      else {
        other = phone2[0];
      }
    }
    this.addColumn_(csv_row, mobile);
    this.addColumn_(csv_row, other);
    
    // IM Parsing just 3.
    for (i = 0; i < 3; i++){
      var screen_name = friend.screen_names[i];
      var name = null;
      if (screen_name)  {
        name = screen_name[1] + ': ' + screen_name[0];
      }
      this.addColumn_(csv_row, name);
    }

    // Website parsing.
    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.websites[i]);
    }
    
    // Friend FB parsing.
    this.addColumn_(csv_row, friend.fb);

    csv_rows.push(csv_row);

    // Callback to inform client 
    callback({
        finishedProcessingFriend: true,
        friend: friend,
        success: 1,
        message: "Added to CSV!"
    });
  }

  this.dump = this.header.join(',') + '\n';

  for (i in csv_rows) {
    this.dump += csv_rows[i].join(',') + '\n';
  }
};

/**
 * Get the dump CSV text.
 */
CSVExporter.prototype.getDump = function() {
  return this.dump;
};

/**
 * Adds a column safely to each spot.
 
 * @private
 *
 * @param {String[]} row A reference to a row that we need to push columns to.
 * @param {String} column A string that will be added to the row.
 */
CSVExporter.prototype.addColumn_ = function(row, column) {
  if (column) {
    row.push(column);
  } else {
    row.push('');
  }
};
