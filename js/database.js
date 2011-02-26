/**
 * Storage class responsible for managing the database
 * tansactions for friends
 */
FriendDB = function () {
  this.db = null;
};

/**
 * Opens a connection to Web SQL table.
 */
FriendDB.prototype.open = function() {
  var db_size = 5 * 1024 * 1024; // 5MB
  this.db = openDatabase('Facebook Friend Export', '1.0', 'fb-export', db_size);
};

/**
 * For simplicity, just show an alert when crazy error happens.
 */
FriendDB.prototype.onError = function(tx, e) {
  alert('Something unexpected happened: ' + e.message );
};

/**
 * Creats a table with the following columns:
 *      id   - Integer
 *      data - String
 *      ts   - Timestamp
 */
FriendDB.prototype.createTable = function() {
  this.db.transaction(function(tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS ' + 
                  'friend(id INTEGER, data TEXT, ts DATETIME)', []);
  });
};

/**
 * Adds a |friend| to the database, the contents gets serialized to String.
 * Current time is tracked as well.
 */
FriendDB.prototype.persistFriend = function(friend, onSuccess) {
  var ts = new Date();
  var data = JSON.stringify(friend);
  this.db.transaction(function(tx) {
    tx.executeSql('INSERT INTO friend(id, data, ts) VALUES (?,?,?)', 
                  [friend.id, data, ts], onSuccess, this.onError);
  });
};

/**
 * Retrieves a row from the table given |id|. The result goes to |response|. 
 * This is an asynchronous action.
 */
FriendDB.prototype.getFriend = function(id, response) {
  this.db.transaction(function(tx) {
    tx.executeSql('SELECT data FROM friend WHERE id = ?', [id],
        function (tx, rs) {
          if (rs.rows.length != 0) {
            response({status: true, data: JSON.parse(rs.rows.item(0).data)});
          }
          else {
            response({status: false});
          }
        }, this.onError
    );
  });
};

/**
 * Update the friend object.
 */
FriendDB.prototype.updateFriend = function(friend) {
  var ts = new Date();
  var data = JSON.stringify(friend);
  this.db.transaction(function(tx) {
    tx.executeSql('UPDATE friend SET data = ?, ts = ? WHERE id = ?',
        [data, ts, friend.id], null,  this.onError
    );
  });
};


/**
 * Removes every row from the table
 */
FriendDB.prototype.clear = function() {
  this.db.transaction(function(tx) {
    tx.executeSql('DELETE FROM friend', [], null,  this.onError);
  });
};