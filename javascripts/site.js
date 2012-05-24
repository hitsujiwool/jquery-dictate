$(function() {
  var $panel = $('#panel');
  var api = $panel.dictate('Is this a pen?', 'No, it isn\'t.', 'It\'s an apple.', {
    exposed: ".',?!",
    caseInsentive: true,    
    complete: function() {
      var stats = api.getStats();
      if (stats.giveup) {
        $panel.siblings('.bad').show();
      } else if (stats.opened > 0) {
        $panel.siblings('.good').show();
      } else {
        $panel.siblings('.best').show();
      }
    }
  }).data('dictate').start();
  
  $('.char').on('click', function() {
    api.showNextChar();
  });

  $('.word').on('click', function() {
    api.showNextWord();
  });
  
  $('.giveup').on('click', function() {
    api.giveup();
  });
});