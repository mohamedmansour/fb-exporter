/**
 * Routines to handle csv exporting.
 */
CSVExporter = function(friends) {
  this.friends = friends;
  this.header = ['Name', 'E-mail Address 1', 'E-mail Address 2', 'E-mail Address 3',
                  'Mobile Phone', 'Home Phone',
                  'Google Talk', 'MSN', 'Skype', 'Yahoo',
                  'Website 1', 'Website 2', 'Website 3',
                  'Website Facebook', 'Home Address', 'Birthday'
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
    this.addColumn_(csv_row, friend.phone.mobile);
    this.addColumn_(csv_row, friend.phone.other);
    
    // IM Parsing just 4.
    this.addColumn_(csv_row, friend.im.gtalk);
    this.addColumn_(csv_row, friend.im.hotmail);
    this.addColumn_(csv_row, friend.im.skype);
    this.addColumn_(csv_row, friend.im.yahoo);

    // Website parsing.
    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.websites[i]);
    }
    
    // Friend FB parsing.
    this.addColumn_(csv_row, friend.fb);
    
    // Address parsing.
    this.addColumn_(csv_row, friend.address);

    // Birthday parsing.
    this.addColumn_(csv_row, friend.birthday);
    
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
 * Adds a column safely to each spot. It will wrap each column with quotes, and
 * escape quotes that exists within.
 *
 * @private
 *
 * @param {String[]} row A reference to a row that we need to push columns to.
 * @param {String} column A string that will be added to the row.
 */
CSVExporter.prototype.addColumn_ = function(row, column) {
  if (column) {
    row.push('"' + column.replace(/"/g, '\\"') + '"');
  } else {
    row.push('');
  }
};
