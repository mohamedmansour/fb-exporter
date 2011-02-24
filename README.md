Facebook Exporter Contact Exporter
==================================

![Screenshot of the Chrome Extension](https://github.com/mohamedmansour/fb-exporter/raw/master/exporter.png)

Your friends on Facebook made their information public to you, such as their 
email, phonenumber, and websites. They want you to know about them! But there 
is no way to extract such data and place it in your most used contact book so 
you can keep in touch with them.

fb-exporter extension will allow you to get their contact information so you
can contact them with your favorite email client. You can extract their 
information and transfer it to your client.

Your not stealing their information, your friends are making it public for you 
to use them. They want you to contact them. Thats what friends do eh?

Functionality
-------------------
 - I am reading your Facebook friends all at once in a variable.
That variable allows us to instantly see the users photo in a nice collage, 
and export everyone at the same time without any manual process, or you can pick
and choose anyone.

 - Not only exports your friends emails, it exports your contacts phone numbers,
 emails, end IM screen names such as Google Talk, Yahoo, ICQ, Skype, QQ, and MSN
 (Windows Live Messenger, Hotmail), and your friends birthday!
 
 - There are error handling routines as well, if Facebook doesn't like what your 
doing, it will stop instantaneously! You can start it back again next day or
in a couple of hours. Just open up the log, and you can see errors when it happens.

 - The results are cached, so if you want to continue the process some other time,
then no worries, it will continue from the last processed contact. 

 - I have refactored some portions of the code and added comments where applicable
I have added a better UI. For example, a Facbook style dialog instead of the
custom one made before. I have changed the way the process works too.

How to download
---------------
 - It is available in the Chrome Web Store https://chrome.google.com/webstore/detail/ficlccidpkaiepnnboobcmafnnfoomga

Facebook
-------------
They are converting emails into images so you cannot copy it somewhere (say what?
99% of the people copy the email into their email client). I added mechanism that catches
that instantly. So you don't have to worry if they see something. The process will
stop, and you can start it again the next day. When you start it again, it will pick up
where it left off.


Have fun! Feel free to submit patches and fork :)


