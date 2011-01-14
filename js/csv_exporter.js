/**
 * Routines to handle csv exporting.
 */
CSVExporter = function(friends) {
  this.friends = friends;
  this.header = ['Name', 'Email 1', 'Email 2', 'Email 3',
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

    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.email[i]);
    }

    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.aims[i]);
    }

    for (i = 0; i < 3; i++){
      this.addColumn_(csv_row, friend.websites[i]);
    }
    
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
