Exporter = {};

Exporter.getScreenNameType = function(screenname) {
  switch (screenname) {
    case '(Google Talk)':             return 'GOOGLE_TALK';
    case '(Skype)':                   return 'SKYPE';
    case '(AIM)':                     return 'AIM';
    case '(Windows Live Messenger)':  return 'MSN';
    case '(Yahoo! Messenger)':        
    case '(Yahoo Japan)':             return 'YAHOO';
    case '(QQ)':                      return 'QQ';
    case '(ICQ)':                     return 'ICQ';
  }
  return null;
};

Exporter.getPhoneType = function(phone) {
  return  (phone != '(Mobile)') ? 'mobile' : 'other';
};