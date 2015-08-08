/*jshint strict:false */
/*global Meteor:false */
/*global Template:false */
/*global $:false */
/*global _:false */
/*global Session:false */
/*global Tracker:false */
/*global Random:false */

var Players = Meteor.neo4j.collection('players');

function buildRegExp(searchText) {
  // this is a dump implementation
  if (searchText) {
    var words = searchText.trim().split(/[ \-\:]+/);
    var exps = _.map(words, function(word) {
      return "(?=.*" + word + ")";
    });
    var fullExp = '(?i)' + exps.join('') + ".+"
    return fullExp;
  } else {
    return '.*';
  }
}

if (Meteor.isClient) {

  Tracker.autorun(function() {
    var search = buildRegExp(Session.get('searchtext'));
    Players.subscribe('allPlayers', {searchtext: search}, 'node');
  });

  Template.leaderboard.helpers({
    players: function() {
      return Players.find({
        'metadata.labels': 'Player'
      }, {
        sort: {
          score: -1
        }
      });
    },
    selectedName: function() {
      var player = Players.findOne({
        _id: Session.get('selectedPlayer')
      });
      if (player) {
        return player.name;
      }
    },
    selectedPlayer: function() {
      return Session.get('selectedPlayer');
    }
  });

  Template.leaderboard.events({
    'click .inc': function() {
      Players.update({
        _id: Session.get('selectedPlayer')
      }, {
        '$inc': {
          score: 5
        }
      });
    },
    'keyup #searchtext': function(evt, tmpl) {
      //    if (evt.which === 13) {
      if (evt.keyCode == 13) {
        console.log("return!");
        var searchtext = tmpl.find('#searchtext').value;
        Session.set("searchtext", searchtext);
        console.log("New Search: " + searchtext);
      }
    }
  });

  Template.addPlayer.events({
    'click #addPlayer': function() {
      if ($('#newPlayerName').val()) {
        Players.insert({
          name: $('#newPlayerName').val(),
          score: 0,
          __labels: ':Player'
        });
        $('#newPlayerName').val('');
      }
    }
  });

  Template.player.helpers({
    selected: function() {
      if (Session.equals('selectedPlayer', this._id)) {
        return 'selected';
      }
    }
  });

  Template.player.events({
    'click': function() {
      Session.set('selectedPlayer', this._id);
    },
    'click #removePlayer': function(e) {
      $(e.target).parent().remove();
      Players.remove({
        _id: this._id
      });
      Session.set('selectedPlayer', false);
    }
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {

  Meteor.N4JDB.listen(function(query, opts){
    console.log('Incoming query: ' + query, opts);
  });



  Players.publish('allPlayers', function() {
    return 'MATCH (node:Player) WHERE node.name =~ {searchtext} RETURN node ORDER BY node.score DESC';
  }, function() {
    /* onSubscribe callback */
    if (Players.find({}).count() <= 0) {
      var names = [
        'Ada Lovelace',
        'Grace Hopper',
        'Marie Curie',
        'Carl Friedrich Gauss',
        'Nikola Tesla',
        'Claude Shannon',
        'Ostr.io'
      ];
      var players = [];
      _.each(names, function(name) {
        players.push({
          name: name,
          score: Math.floor(Random.fraction() * 10) * 5,
          __labels: ':Player'
        });
      });
      Players.insert(players);

      // Meteor.neo4j.query('CREATE (a:Player {players})', {players: players}, function(err){
      //   if(err){
      //     throw err;
      //   }
      // });

      // Meteor.N4JDB.query('CREATE (a:Player {players})', {players: players}, function(err){
      //   if(err){
      //     throw err;
      //   }
      // });
    }
  });
}