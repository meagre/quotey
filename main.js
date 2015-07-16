// ___  ___                          
// |  \/  |                          
// | .  . | ___  __ _  __ _ _ __ ___ 
// | |\/| |/ _ \/ _` |/ _` | '__/ _ \
// | |  | |  __/ (_| | (_| | | |  __/
// \_|  |_/\___|\__,_|\__, |_|  \___|
//                     __/ |         
//                    |___/          
// 
// Qurious, a web app for creating and sharing quotes



// First up we are going to create a few collections
Quotes = new Mongo.Collection('quotes');
Counters = new Mongo.Collection('counters');


// Initial setup of some things below



// Here we have stuff that will only run on the client's browser

if (Meteor.isClient) { // only runs on the client


  // We need to tell the client to subscribe explicitly to data collections
  // Later we don't want to subscribe to the whole thing
  // moved to individual routes // Meteor.subscribe("quotes");
  Meteor.subscribe("counters");
  Meteor.subscribe("userData"); // for admin access etc.


  // Here we work out what kind of signups we want to use
  // One of 'USERNAME_AND_EMAIL', 'USERNAME_AND_OPTIONAL_EMAIL', 
  // 'USERNAME_ONLY', or 'EMAIL_ONLY' (default).
  // Note: this doesn't do anything when using useraccounts:core
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });


  // Some more configs to run initially

  Router.configure({
    layoutTemplate: 'ApplicationLayout',
    loadingTemplate: "Loading",
    //notFoundTemplate: '404' //this is used for somewhat custom 404s
  });


  Router.plugin('dataNotFound', {notFoundTemplate: 'NotFound'});


  // We have a package that gets us to the top when we navigate
  // This changes the animation period, set to zero for none 
  IronRouterAutoscroll.animationDuration = 0;


  // Call this at any time to set the <title>
  Session.set("DocumentTitle","Qurious - quotes etc.");

  // Sets up automatically setting <title> in head
  Deps.autorun(function(){
    document.title = Session.get("DocumentTitle");
  });

  



  // Setting up the useraccounts:core
  AccountsTemplates.configure({
    forbidClientAccountCreation: false,
    enablePasswordChange: true,
    showForgotPasswordLink: true,
    lowercaseUsername: true,
  });


  AccountsTemplates.configure({ // Here we enter some custom error messages
      texts: {
          errors: {
              accountsCreationDisabled: "Client side accounts creation is disabled!!!",
              cannotRemoveService: "Cannot remove the only active service!",
              captchaVerification: "Captcha verification failed!",
              loginForbidden: "error.accounts.User or password incorrect",
              mustBeLoggedIn: "error.accounts.Must be logged in",
              pwdMismatch: "error.pwdsDontMatch",
              validationErrors: "Validation Errors",
              verifyEmailFirst: "Please verify your email first. Check the email and follow the link!",
          }
      }
  });

  var pwd = AccountsTemplates.removeField('password');
  AccountsTemplates.removeField('email');
  AccountsTemplates.addFields([
    {
        _id: "username",
        type: "text",
        displayName: "username",
        required: true,
        minLength: 5,
    },
    {
        _id: 'email',
        type: 'email',
        required: true,
        displayName: "email",
        re: /.+@(.+){2,}\.(.+){2,}/,
        errStr: 'Invalid email',
    },
    pwd
  ]);





  // Here are the helpers

/* moving to iron router data context
  Template.Quotes.helpers({
    quotes: function () {
      return Quotes.find({}, {sort: {createdAt: -1}});
    }
  });
*/
  


  UI.registerHelper('formatTime', function(context, options) {
    if(context)
      return moment(context).format('DD/MM/YYYY, hh:mm');
  });


  Template.registerHelper('currentUsername', function () {
      return Meteor.user().username;
    }
  );

// Events that drive things like clicks etc

  Template.Quotes.events({
    "click .delete": function () {
      Meteor.call('deleteQuote', this._id);
    },
    /*"click .list-quote": function () {
      Router.go('/quotes/' + this._id);
    }*/
  });




    Template.Create.events({
    "submit .new-quote": function (event) {
      var text = event.target.text.value;
      var attribution = event.target.attribution.value;
      if (text == "" || attribution == "") return false; // prevent empty strings

      Meteor.call('addQuote', text, attribution, function(error, result) {
        var newQuoteId = result;
        Router.go('/quotes/' + newQuoteId);
      });

      // Clear form
      event.target.text.value = "";
      event.target.attribution.value = "";

      

      // Prevent default action from form submit
      return false;
    },
    "click .delete": function () {
      Meteor.call('deleteQuote', this._id);
    }
  });



} // this marks the end of the client code





// ---------------- Code for the server only goes below
if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup

    // init the counters in case mongo reset
    if (Counters.find().count() === 0) {
      Counters.insert( { _id: "quote_id", seq: 0 } );
    }

    

/* had to remove due to unstyled accounts for some reason
  Accounts.config({
    forbidClientAccountCreation : false  // set this to true to disable signup
    });
*/

  });  // end of code to do at startup



  // Get the server to publish our collections
  Meteor.publish("quotesAll", function () {
    return Quotes.find({} /*,  {sort: {createdAt: -1}, limit: 3} */);
    self.ready();
  });

  Meteor.publish("quotesCurrentUser", function () {
    return Quotes.find({ owner: this.userId });
    self.ready();
  });

  Meteor.publish("counters", function () {
    return Counters.find();
  });

  // We are going to publish some more userData
  // to check if user is admin
  Meteor.publish("userData", function () {
    if (this.userId) {
      return Meteor.users.find({_id: this.userId},
                               {fields: {'admin': 1}});
    } else {
      this.ready();
    }
  });


} // end of the server only code



// Meteor methods can be called by the client to do server things
// They can also be called by the server
Meteor.methods({
  addQuote: function (text, attribution) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    
    Counters.update({ _id: 'quote_id' }, { $inc: { seq: 1 } });
    
    var counter = Counters.findOne({ query: { _id: 'quote_id' } });
                
    var newQuote = Quotes.insert({      
      attribution: attribution,
      quotation: text,
      createdAt: new Date(), // current time
      username: Meteor.user().username, // username of quote
      owner: Meteor.userId(),  // _id of logged in user      
      quote_id: counter.seq.toString()
    });

    return newQuote;
  },


  deleteQuote: function (quoteId) {
    Quotes.remove(quoteId);
  },


  incQuoteViewCounter: function (quoteId) {
    Quotes.update( { _id: quoteId }, {$inc: { views: 1 } });
  },



// This isn't being used any more, but maybe in the future
  addAuthor: function (author) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    // We wanted to have the slug as something the URL defines
    function slugify(text)
    {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    }

    slug = slugify(author);

      try {
      Authors.insert({
        name: author,
        slug: slug,   
        createdAt: new Date(), // current time
      });
    } catch (e) {
      throw new Meteor.Error("already-exists", "The slug has to be unique: " + e);
    }
  },
  deleteAuthor: function (authorId) {
    Authors.remove(authorId);
  },




// We are not using this either
  changeTheme: function (quoteId, quoteTheme) {
    if (quoteTheme == "blue") {
      Quotes.update({ _id: quoteId }, { $set: { theme: 'green' }});
    } else {
      Quotes.update({ _id: quoteId }, { $set: { theme: 'blue' }});
    }
  }
});




// Here come our routes which catch and process URLs

/* just going to make our own route so not needed
AccountsTemplates.configureRoute('signIn', {
    name: 'signin',
    path: '/login',
    template: 'Login',
    layoutTemplate: 'ApplicationLayout',
    redirect: '/',
});
*/



Router.route('/login', function() {
  this.render('Header', {to: 'header'});
  this.render('Login');
});


Router.route('/logout', function() {
  Meteor.logout();
  Router.go('/');
});



// Here is a nice little route that gives a single quote
// given a specified _id in the quotes collection as URL param
Router.route('/quotes/:_quote_slug', {
  loadingTemplate: 'Loading',
  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('quotesAll');
  },
    onBeforeAction: function() {
    Meteor.call('incQuoteViewCounter', this.params._quote_slug);
    this.next()   
  },
  action: function () {
    this.render('Header', {to: 'header'});
    this.render('SingleQuote', {
      data: function () {
        var quote = Quotes.findOne({ _id: this.params._quote_slug });
        if (!quote) {
          this.render('NotFound');
        } else {      
          return quote;
        }    
      }
    });  
  }
});



Router.route('/create', {
  loadingTemplate: 'Loading',

  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('userData');
  },

  action: function () {
    this.render('Header', {to: 'header'});
    this.render('Create', {
      data: {
        isAdmin: function() {
          if (Meteor.user().admin) return true;
          else return false;
        }
      }
    });
    console.log(Meteor.user().admin); // testing the admin setting
  }
});






Router.route('/quotes', {
  loadingTemplate: 'Loading',

  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('quotesAll');
  },

  action: function () {
    this.render('Header', {to: 'header'});
    this.render('Quotes', {
      data: {
        quotes: function () {
          return Quotes.find({}, {sort: {views: -1}, limit: 20 });
        }
      }
    });
  }
});


Router.route('/mine', {
  loadingTemplate: 'Loading',

  waitOn: function () {
    // return one handle, a function, or an array
    return Meteor.subscribe('quotesCurrentUser');
  },

  action: function () {
    this.render('Header', {to: 'header'});
    this.render('Quotes', {
      data: {
        quotes: function () {
          return Quotes.find({ }, {sort: {createdAt: -1}});
        }
      }
    });
  }
});



Router.route('/', {
  /*waitOn: function () {
    return Meteor.subscribe('quotes');
  },*/
  action: function () {
    this.render('Header', { 
      to: 'header',
      data: {
        frontPage: true
      }
    });

    this.render('Home');
/*
    this.render('Home', {
      data: function() {
        var count = Quotes.find().count();
        var random_index = Math.floor(Math.random() * (count));
        var random_object = Quotes.findOne({}, {skip:random_index}
        );
        return random_object;
      }
    });
*/
  }
});


// Just to test the loader
Router.route('/loading', function() {  
  this.render('Loading');
});



// This is our catch all for unknown things
Router.route('/(.*)', function() {
  this.render('Header', {to: 'header'});
  this.render('404');
});