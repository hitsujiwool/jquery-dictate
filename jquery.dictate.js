/*!
 * jquery.dictate
 * Copyright(c) 2012 hitsujiwool <utatanenohibi@gmail.com>
 * MIT Licensed
 */
(function($) {

  var dictate = (function(exports) {

    function EventEmitter() {
      this.callbacks = {};
    };
    
    EventEmitter.prototype.on = function(event, fn) {
      (this.callbacks[event] = this.callbacks[event] || []).push(fn);
      return this;
    };
    
    EventEmitter.prototype.emit = function(event) {
      var args = Array.prototype.slice.call(arguments, 1),
          callbacks = this.callbacks[event],
          len;
      if (callbacks) {
        len = callbacks.length;
        for (var i = 0; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }
      return this;
    };
    
    EventEmitter.prototype.removeAllListeners = function(event) {
      this.callbacks[event] = [];
    };

    function dictate(str, options) {    
      return new Dictate(str, options);
    };
    
    function Dictate(str, options) {
      var defaults = {
        caseInsentive: false,
        skip: function() {}
      };
      options = options || {};
      for (var key in defaults) {
        defaults[key] = options[key];
      }
      EventEmitter.call(this);
      this.str = str;
      this.counter = 0;
      this.options = defaults;
    };

    Dictate.prototype = new EventEmitter;
        
    Dictate.prototype.next = function() {
      this.counter++;
      if (this.counter >= this.str.length) {
        this.emit('complete');
        this.callbacks = {};
      }
      return this;
    };
    
    Dictate.prototype.hasNext = function() {
      return this.counter < this.str.length;
    };
    
    Dictate.prototype.get = function() {
      return this.str.charAt(this.counter);
    };
    
    Dictate.prototype.input = function(chr) {
      if (this.options.caseInsentive ? (this.get() === chr.toUpperCase() || this.get() === chr.toLowerCase()) : this.get() === chr) {
        this.emit('accept', this.get()).skip();
      } else {
        this.emit('reject', chr);
      }
    };
    
    Dictate.prototype.skip = function() {
      var next;
      do {
        if (!this.hasNext()) break;
        next = this.next().get();
      } while (this.options.skip(next) && this.emit('skip', next))
      return this;
    };

    return dictate;

  })({});
  
  $.fn.dictate = function() {
    var WORD_BOUNDARY = '.,:;? ';
    
    var $this = this;

    var args = Array.prototype.slice.apply(arguments),
        last = args[args.length - 1],
        options = {},
        api = {},
        exposed = '',
        sentences,
        problem,
        spans;

    var stats = {
      characters: 0,
      accepted: 0, 
      opened: 0,
      errors: 0,
      giveup: false
    };
    
    function render(chr) {
      $this.stop();
      var $span = $(spans.shift());
      $span.removeClass('active');
      $span.text(chr);
      if (spans.length > 0) $(spans[0]).addClass('active');
    };

    function accept(chr) {
      render(chr);
    };

    function reject(chr) {
      if (!$this.is(':animated')) {
        $this.effect('shake', { times: 3, distance: 6 }, 50);
      }
    };

    function complete(data) {};

    if (typeof last == 'object') {
      args.pop();
      exposed = last.exposed;
      delete last.exposed;
      options = last;
      options.skip = function(chr) {
        return exposed.indexOf(chr) > -1 || chr === ' ';
      };
    }
    sentences = args;

    $this.addClass('dictate');

    $.each(sentences, function(index, sentence) {
      var chr;      
      var $p = $('<p class="sentence">');    
      for (var i = 0, len = sentence.length; i < len; i++) {
        chr = sentence[i];
        var $span = $('<span>&nbsp;</span>');
        if (chr === ' ') $span.addClass('space');
        if (exposed.indexOf(chr) > -1) {
          $span.addClass('exposed');
          $span.text(chr);
        }
        $p.append($span);
      }
      $this.append($p);
    });

    spans = $('#panel span:not(".space"):not(".exposed")').toArray();
    problem = dictate(args.join(''), options);

    stats.characters = spans.length;

    problem.on('accept', function(chr) {
      stats.accepted++;
      (options.accept || accept)(chr);
      if (options.afterAccept) options.afterAccept(chr);
    });
    
    problem.on('reject', function(chr) {
      stats.errors++;
      (options.reject || reject)(chr);
      if (options.afterReject) options.afterReject(chr);
    });
    
    problem.on('complete', function() {
      (options.complete || complete)();
      if (options.afterComplete) options.afterComplete();
    });
    
    /*
     * export APIs 
     */    
    api.start = (function() {
      var alreadyStarted = false;
      return function() {
        if (!alreadyStarted) {
          alreadyStarted = true;
          $this.find('.sentence:first span:first').addClass('active');
          $(window).on('keypress', function(e) {
            problem.input(String.fromCharCode(e.charCode));
          });
        }
        return api;
      };
    })();
    
    api.showNextChar = function() {
      if (spans.length === 0) return api;
      render(problem.get());
      problem.skip();
      stats.opened++;
      return api;
    };

    api.showNextWord = function() {
      var skipped;
      if (spans.length === 0) return api;
      problem.on('skip', function(chr) {
        skipped = chr;
      });
      do {
        render(problem.get());
        problem.skip();
        stats.opened++;
      } while (WORD_BOUNDARY.indexOf(skipped) === -1)
      problem.removeAllListeners('skip');
      return api;
    };
    
    api.getStats = function() {
      var clone = {};
      for (var key in stats) {
        clone[key] = stats[key];
      }
      return clone;
    };

    api.giveup = function() {
      while(spans.length > 0) {
        render(problem.get());
        problem.skip();
      }
      stats.giveup = true;
      return api;
    };

    $this.data('dictate', api);
    return $this;
  };

})(jQuery);