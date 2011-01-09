Facebook Exporter Contact Exporter
==================================

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
This extension will extract their phone numbers too! So you can sync them into 
your contact book as well. Great to place in your mobile phone or call them 
directly from an online phone.

I am using a different approach, then the forked version. The forked version 
just converted the contacts shown on the screen, so if you wanted to export
all your contacts, you had to manually do it, which was a pain. Instead of 
manually pressing next from your contacts friends, I am reading the internal 
JavaScript variable that Facebook maintains. I am passing that variable back to
my extension by using custom events. That allows us to actually see the users
photo in a nice collage, and export everyone at the same time without any manual
process.

I have refactored some portions of the code and added comments where applicable
I have added a better UI. For example, a Facbook style dialog instead of the
custom one made before. I have changed the way the process works too.


Some problems
-------------
Facebook is somehow enabling images for emails. I am trying to figure out how
they enable them. For some strange reason, I believe they use images instead of
text if you make too many friend requests at the same time. I believe the answer
to that problem would be slowly initiate the requests, but that will make it a 
lengthy process. In the future release, I will it an option.


Have fun! Feel free to submit patches and fork :)


