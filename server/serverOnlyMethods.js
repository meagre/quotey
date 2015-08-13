// These Meteor methods only run on the server. This is useful to hide things from the client.
// Things like database changes that the client might do latency compensation on are especially
// useful to hide from the client.

Meteor.methods({

  // Throw the dice with all the db docs
	getRandomQuoteId: function() {
    var count = Quotes.find().count();
    var random_index = Math.floor(Math.random() * (count));
    var random_object = Quotes.findOne({}, {skip:random_index});
    return random_object._id;
  },


  // This happens each time the user looks at a quotation
  viewQuote: function (quoteId) {

    var activeQuote = Quotes.findOne({ _id: quoteId });

    // Just make sure we have a dogear attribute
    if (!Quotes.findOne({_id: quoteId, upcount: {$exists: true}})) {
      Quotes.update( { _id: quoteId }, {$set: { upcount: 0 }});
    }

    // Set views if not there
    if (!Quotes.findOne({_id: quoteId, views: {$exists: true}})) {
      Quotes.update( { _id: quoteId }, {$set: { views: 0 }});
    }


    // Update last time viewed attribute
    Quotes.update({ _id: quoteId }, { $set: { lastViewed: new Date() }});



    // Check if the user hasn't visited this question already
    if (Meteor.userId()) {

      // This checks the user doc to see if the quote _id is in the list
      var user = Meteor.users.findOne({_id:this.userId,quotesVisited:{$ne:quoteId}});

 
      // Here we are trying to stop view refresh hacking
      // Please someone find a better way of doing this later, cheers
      if (activeQuote.lastViewedBy != this.userId) {
      
        Quotes.update( { _id: quoteId }, {$inc: { views: 1 }});
        
        Meteor.users.update({_id:this.userId},{$addToSet:{quotesVisited:quoteId}});
      }

      // Update last viewed by
      Quotes.update({ _id: quoteId }, { $set: { lastViewedBy: this.userId }});      
    }
    else {
      console.log(clientIp + " accessed quote");
    }
  },

  
  // This is a feature to "Like" a quotation. It should put the quote in the user's
  // likes list and then update the 
  collectQuote: function (quoteId) {
    if (Meteor.userId()) {
      var user = Meteor.users.findOne({_id:this.userId,liked:{$ne:quoteId}});
      

      if (!user) {
        Meteor.users.update({_id:this.userId},{$pull:{liked:quoteId}});
        Quotes.update( { _id: quoteId }, {$inc: { upcount: -1 } });

        return false;
      }

      
      console.log("user " + this.userId + " collected the quote " + quoteId );

      Quotes.update( { _id: quoteId }, {$inc: { upcount: 1 } });
      Meteor.users.update({_id:this.userId},{$addToSet:{liked:quoteId}});
      return true;
    }
  },

});