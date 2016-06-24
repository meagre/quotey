// This file handles all the URL routes. It uses the iron:router Meteor package.



// Let's test out an API call for use in the future
Router.route('/api', function () {
	var req = this.request;
	var res = this.response;
	res.end('hello from the server\n');
}, {where: 'server'});



/* The root home route landing for qurious.cc/   */
Router.route('/', {
	waitOn: function () {
		
	},
	// onBeforeAction: function() {
	//   if (! Meteor.userId()) {
	//     this.render('Loading');
	//     console.log('logging in');
	//   } else {
	//     this.next();
	//   }
	// },
	action: function () {
		Session.set("DocumentTitle","Qurious");


		// console.log(Meteor.user().services.twitter.profile_image_url);
		// this.render('Nav', { to: 'nav'});
		
		this.render('Home', {
			data: {
				quotation: "Somewhere, something incredible is waiting to be known.",
				page: "Carl Sagan",
				greeting: function () {
					var greetings = [
						"Howdy",
						"Hi",
						"Yo",
						"Hey",
					];
					var greeting = greetings[Math.floor(Math.random() * greetings.length)];
					return greeting;
				}
			}
		});
	}
});


Router.route('/explore', {
	waitOn: function () {
		return Meteor.subscribe('pagesVerified'); 
	},
	action: function () {
		Session.set("DocumentTitle","Qurious");

		this.render('Header', { to: 'header'});

		// this.render('Nav', { to: 'nav'});

		this.render('Explore', {
			data: {
				pages: function () {
					// We were going to only return ones in his bookmarks
					// profileHasPages = Meteor.users.findOne( { _id: Meteor.userId(), "profile.pages": {$exists: true} });
					// if (profileHasPages) {
					//   var pages = Pages.find({ _id: { $in: Meteor.user().profile.pages } }, { sort: {name: 1}});
					//   return pages;
					// }

					var pages = Pages.find({ verified:true }, { sort: {name: 1}});
					return pages;
				},				
			}
		});
	}
});


Router.route('/explore/all', {
	waitOn: function () {
		return Meteor.subscribe('pagesAll'); 
	},
	action: function () {
		Session.set("DocumentTitle","Qurious");

		// console.log(Meteor.user().services.twitter.profile_image_url);

		this.render('Header', { to: 'header'});

		// this.render('Nav', { to: 'nav'});

		this.render('ExploreAll', {
			data: {
				pages: function () {
					var pages = Pages.find({ $or: [ { verified:false } , { verified: { $exists:false } }] });
					return pages;
				},				
			}
		});
	}
});



Router.route('/forgot', {
	// Automatically renders the "Forgot" template
});

Router.route('/password-reset/:_token', {
	action: function () {
		Session.set('resetToken', this.params._token);
		this.render('PasswordReset', {
			data: {
				resetToken: this.params._token,
			}
		});
	}
});


Router.route('/settings', {
	waitOn: function () {
		// return Meteor.subscribe('profiles');
	},
	action: function () {
		Session.set("DocumentTitle","Qurious");

		// if (!Meteor.user() ) Router.go('/sign-in');
		this.render('Nav', { to: 'nav'});
		this.render('Settings', {
			data: {
				// don't need user data as it is auto published in currentUser.profile
				// fullName: function () {
				//   return Meteor.user().profile.fullName;
				// }
			}
		});
	}
});


Router.route('/subscribe', {
	action: function () {
		this.render('Subscribe');
	}
});



Router.route('/add', {
	waitOn: function () {
		
	},
	action: function () {
		// if (!Meteor.user() ) Router.go('/login'); // deny not logged in Meteor.loginWithTwitter. Doesn't seem to work because on refresh etc
		// if (!Meteor.user() ) Meteor.loginWithTwitter();

		this.layout('Layout');
		Session.set("DocumentTitle","Qurious - Add Author");

		this.render('Header', { to: 'header'});

		// this.render('Nav', { to: 'nav'});
		this.render('Add');
	}
});





Router.route('/faq', {
	action: function () {
		// this.render('Nav', { to: 'nav'});
		this.render('Faq');
	}
});



Router.route('/register', {
	waitOn: function () {
		// return Meteor.subscribe('invites');
	},
	action: function () {
		if (Meteor.user() ) Router.go('/'); // deny logged in

		// We check the Invite list (fix so it's secure later)
		// var invited = Invites.find({ }).fetch();    

		// var arrayInvited = [];

		// invited.forEach( function (invitee) {
		//   arrayInvited.push(invitee.email);
		// });    

		// Session.set('Invited', arrayInvited);

		// This has now been secured so it only returns input emails


		this.layout('Layout');
		this.render('Register');
		
	}
});




Router.route('/not-found', {
	action: function () {
		this.render('404');
	}
});


Router.route('/login', {
	waitOn: function () {

	},
	action: function () {
		if (!Meteor.loggingIn()) { // I don't know about this, but should learn
			if (Meteor.user() ) Router.go('/'); // deny logged in
		}
		this.layout('Layout');
		Session.set("DocumentTitle","Qurious");

		// this.render('Nav', { to: 'nav'});
		this.render('Login');
	}
});


Router.route('/admin', {
	action: function () {
		var loggedInUser = Meteor.userId();
		if (!Roles.userIsInRole(loggedInUser, 'admin')) Router.go('/');
		this.render('404');
	}
});

Router.route('/invite', {
	action: function () {
		var loggedInUser = Meteor.userId();
		if (Roles.userIsInRole(loggedInUser, 'admin')) Router.go('/');
		this.render('404');
	}
});



// Quick and easy logouts
Router.route('/logout', function() {
	Meteor.logout();
	Meteor.setTimeout( function () { Router.go('/') }, 1000);
});


// How to add an author
Router.route('/:_slug/add', {
	waitOn: function () {
		return Meteor.subscribe('pagesWithPageSlug', this.params._slug);
	},
	action: function () {
		var slug = this.params._slug;
		currentPage = Pages.findOne({slug: slug});
		Session.set("DocumentTitle", "Add a " + currentPage.name + " quotation - Qurious");
		Session.set("pageId", currentPage._id);

		// this.render('Nav', { to: 'nav'});
		this.render('AddQuote');
		// this.render('Nav', { to: 'nav'});
	}
});

// Edit page for authors/pages/whatever
Router.route('/:_slug/edit', {
	waitOn: function () {
		return Meteor.subscribe('pages');
	},
	action: function () {
		var slug = this.params._slug;
		currentPage = Pages.findOne({slug: slug});
		Session.set("DocumentTitle", "Add a " + currentPage.name + " quotation - Qurious");
		Session.set("pageId", currentPage._id);

		// this.render('Nav', { to: 'nav'});
		this.render('AddQuote');
		// this.render('Nav', { to: 'nav'});
	}
});


// Display the single quote you found
Router.route('/:_page_slug/:_quote_slug', {
	waitOn: function () {
		Meteor.subscribe('quotesSlug', this.params._quote_slug);
		return Meteor.subscribe('pagesWithPageSlug', this.params._page_slug);
	},
	action: function () {
		var pageSlug = this.params._page_slug;
		var quoteSlug = this.params._quote_slug;
		console.log("Current quoteSlug is: " + quoteSlug );
		currentPage = Pages.findOne({slug: pageSlug});
		Session.set("DocumentTitle", "A quote by " + currentPage.name + " - Qurious");
		Session.set("pageId", currentPage._id);

		// this.render('Nav', { to: 'nav'});
		this.render('DisplayQuote', {
			data: {
				page: function () {
					return Pages.findOne({ slug: pageSlug });
					},
				quote: function () {
					var quote = Quotes.findOne({ slug: quoteSlug });
					return quote;
				}
			}
		});
	}
});







// What quotes does the author have?
// Don't put things below this as they probs won't work
Router.route('/:_slug', {
	waitOn: function () {
		return Meteor.subscribe('pagesWithPageSlug', this.params._slug);
	},
	action: function () {
		var slug = this.params._slug;
		var currentPage = Pages.findOne({slug: slug});
		Session.set('pageSlug', slug);

		if (!currentPage) {
			Session.set("DocumentTitle", "404 not found - Qurious");
			this.render('404');
			return false;
		}
		else {
			Session.set("DocumentTitle", currentPage.name + " - Qurious");
			Meteor.subscribe('quotesAuthorId', currentPage._id);
		}
		if (currentPage.verified) {
			this.render('Header', { to: 'header'});
			this.render('Page', {
				data: {
					page: function () {
						return Pages.findOne({slug: slug});
						},
					quotes: function () {
						var quotes = Quotes.find( { authorId: currentPage._id}, { sort: {quotation: 1}} );
						return quotes;
					},
				}
			});
		} 
		else {
			this.render('PageUnverified',  {
				data: {
					page: function () {
						return Pages.findOne({slug: slug});
						},
					quotes: function () {
						var quotes = Quotes.find( { authorId: currentPage._id}, { sort: {quotation: 1}} );
						return quotes;
					},
				}
			});
		}
	}
});





// This is our catch all for all other unknown things
// Probably won't be called all that much
// Especially after we implement qurious.cc/phocks user pages
Router.route('/(.*)', function() {
	this.layout('Layout');
	Session.set("DocumentTitle","Qurious - 404 not found");
	this.render('404');
});



// Please refrain from putting any routes below here as they will (probably) not work