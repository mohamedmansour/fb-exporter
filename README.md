Facebook Exporter Contact Exporter
==================================

![Screenshot of the Chrome Extension](https://github.com/mohamedmansour/fb-exporter/raw/master/exporter.png)

Forked from http://code.google.com/p/fb-exporter/

Your friends on Facebook made their information public to you, such as their 
email, phonenumber, and websites. They want you to know about them! But there 
is no way to extract such date and place it in your most used contact book so 
you can keep in touch with them.

This extension will allow you to get their contact information in case you would
like to contact them with your favorite email client. You can extract their 
information and transfer it to your client.

Your not stealing their information, your friends are making it public for you 
to use them.

Extra functionality
-------------------
 - I am using a different approach, then the forked version. The forked version 
just converted the contacts shown on the screen, so if you wanted to export
all your contacts, you had to manually do it, which was a pain. Instead of 
manually pressing next from your contacts friends, I am reading the internal 
JavaScript variable that Facebook maintains. I am passing that variable back to
my extension by using custom events. That allows us to actually see the users
photo in a nice collage, and export everyone at the same time without any manual
process, or you can pick and choose anyone.

 - Not only exports your friends emails, it exports your contacts phone numbers,
 emails, end IM screen names such as Google Talk, Yahoo, ICQ, Skype, QQ, and MSN
 (Windows Live Messenger, Hotmail).
 
 - There are error handling routines as well, if Facebook doesn't like what your 
doing, it will stop instantaneously! You can start it back again next day or
in a couple of hours. 

 - The results are cached, so if you want to continue the process some other time,
then no worries, it will continue from the last processed contact. 

 - I have refactored some portions of the code and added comments where applicable
I have added a better UI. For example, a Facbook style dialog instead of the
custom one made before. I have changed the way the process works too.

How to download
---------------
Click on downloads, either load the zip file (under developer, chrome://extensions)
or download the crx and drag that into chrome.

Known problems
---------------
- Filtering friends doesn't work yet.

Facebook
-------------
Facebook is lame. They are converting emails into images so you cannot copy it
somewhere (wut .. 99% of the people copy the email into their email client). I added
a mechanism that catches that instantly. So you don't have to worry if they see
something. The process will stop, and you can start it again the next day. When
you start it again, it will pick up where it left off.


Have fun! Feel free to submit patches and fork :)


