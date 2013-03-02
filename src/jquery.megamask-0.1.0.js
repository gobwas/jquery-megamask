/**
 * jquery.megamask - plugin that creates masks for ur inputs.
 *
 * Version: 0.1.0
 *
 * Copyright 2013, Sergey Kamardin.
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: 2.03.2013
 * Location: Moscow, Russia.
 * Contact: gobwas@gmail.com
 */

(function($, undefined) {

	"use strict";

	/**
	 * Mega constructor.
	 *
	 * @constructor
	 */
	var Megamask = function() {

		$.extend(this, {
			$el:     null,
			length:  0,
			value:   [],
			rules:   [],
			masked:  [],
			options: {
				regexMap: {
					'9': '[0-9]',
					'x': '[a-zA-Z]',
					'*': '.'
				},
				placeholder: '_',
				jumpToFirstEmpty: true
			}
		});

		this.initialize.apply(this, arguments);

		for (var e in this.events) {
			if (this.events.hasOwnProperty(e)) {
				this.$el.bind(e, this[this.events[e]].bind(this));
			}
		}

	};

	/**
	 * Register Megamask in global scope.
	 *
	 * @type {Function}
	 */
	this.Megamask = Megamask;

	/**
	 * Mixin necessary functions in Megamask prototype.
	 */
	$.extend(Megamask.prototype, {

		/**
		 * Events for bind on.
		 */
		events: {
			'keydown' : 'keydown',
			'keypress': 'keypress',
			'blur'    : 'blur',
			'focus'   : 'focus',
			'click'   : 'focus'
		},

		/**
		 * Initialization.
		 * Called after instantiating Megamask.
		 *
		 * @param {Element} element
		 * @param {string}  mask
		 * @param {object}  [options={}]
		 */
		initialize: function(element, mask, options)
		{
			options = options || {};

			$.extend(this.options, options, true);

			this.$el = element;
			this.el  = element.get(0);

			this.resolveMask(mask);
		},

		/**
		 * Flushes current state of Megamask into the input.
		 */
		flush: function()
		{
			var output = '';

			for (var x = 0; x < this.length; x++) {
				if (this.value.hasOwnProperty(x)) {
					output = output.concat(this.get(x) || this.options.placeholder)
				} else {
					output = output.concat(this.masked[x]);
				}
			}

			this.$el.val(output);
		},

		/**
		 * Clears value of the input.
		 */
		clear: function()
		{
			this.$el.val('');
		},

		/**
		 * Checks if current value of input is empty.
		 *
		 * @return {Boolean}
		 */
		isEmpty: function()
		{
			for (var x in this.value) {
				if (this.value.hasOwnProperty(x)) {
					if (this.get(x) != undefined) return false;
				}
			}

			return true;
		},

		/**
		 * Returns raw value of input.
		 *
		 * @return {String}
		 */
		getRaw: function()
		{
			var raw = '';

			$.each(this.value, function(key, symbol) {
				if (symbol != undefined) {
					raw = raw.concat(symbol);
				}
			});

			return raw;
		},

		/**
		 * Parses given mask into the groups of symbols.
		 *
		 * @param {string} mask
		 *
		 * @return {*}
		 */
		resolveMask: function(mask)
		{
			this.length = mask.length;

			for (var x = 0; x < mask.length; x++) {
				var symbol = mask.charAt(x);

				if (this.options.regexMap.hasOwnProperty(symbol)) {
					this.value[x] = null;
					this.rules[x] = new RegExp(this.options.regexMap[symbol]);
				} else {
					this.masked[x] = symbol;
				}
			}

			return this;
		},

		/**
		 * Calculates current position of the caret inside the input.
		 *
		 * @return {Object}
		 */
		resolvePosition: function()
		{
			var start = 0, end = 0, normalizedValue, range,
				textInputRange, len, endRange;

			if (typeof this.el.selectionStart == "number" && typeof this.el.selectionEnd == "number") {
				start = this.el.selectionStart;
				end   = this.el.selectionEnd;
			} else {
				range = document.selection.createRange();

				if (range && range.parentElement() == this.el) {
					len = this.el.value.length;
					normalizedValue = this.el.value.replace(/\r\n/g, "\n");

					// Create a working TextRange that lives only in the input
					textInputRange = this.el.createTextRange();
					textInputRange.moveToBookmark(range.getBookmark());

					// Check if the start and end of the selection are at the very end
					// of the input, since moveStart/moveEnd doesn't return what we want
					// in those cases
					endRange = this.el.createTextRange();
					endRange.collapse(false);

					if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
						start = end = len;
					} else {
						start = -textInputRange.moveStart("character", -len);
						start += normalizedValue.slice(0, start).split("\n").length - 1;

						if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
							end = len;
						} else {
							end = -textInputRange.moveEnd("character", -len);
							end += normalizedValue.slice(0, end).split("\n").length - 1;
						}
					}
				}
			}

			return {
				start: start,
				end:   end
			};
		},

		/**
		 * Sets the caret position inside the input.
		 *
		 * @param {number} key
		 */
		setPosition: function(key)
		{
			if (this.el.setSelectionRange) {
				this.el.setSelectionRange(key, key);
			} else if (this.el.createTextRange) {
				var range = this.el.createTextRange();
				range.move('character', key);
				range.select();
			}
		},

		/**
		 * Returns index of the nearest writable symbol using direction (left -1; right: 1).
		 *
		 * @param {number} key
		 * @param {number} [direction=1]
		 * @return {*}
		 */
		indexOfWritable: function(key, direction)
		{
			direction = direction || 1;

			while (key >= 0 && key < this.length) {
				if (this.value.hasOwnProperty(key)) {
					return key;
				}
				key+= direction;
			}

			return false;
		},

		/**
		 * Returns index of the last filled symbol.
         *
		 * @deprecated
         *
		 * @return {Number}
		 */
		indexOfLastFilled: function()
		{
			var key = 0;

			while (key < this.length) {
				key = this.indexOfWritable(key);
				if (key !== false) {
					if (this.get(key) != undefined) {
						key++;
					} else {
						return key;
					}
				}
			}

			return key;
		},

		/**
		 * Unsets value of the symbol having given index.
		 *
		 * @param {number} key
		 */
		unset: function(key)
		{
			var next;

			if (this.indexOfWritable(key, -1) === false) return;

			for (var x = 0; x < this.length; x++) {
				if (this.value.hasOwnProperty(x) && x >= key) {

					next = this.indexOfWritable(x + 1);

					if (next !== false) {
						this.set(x, this.get(next));
					} else {
						this.set(x, null);
					}
				}
			}
		},

		/**
		 * Sets value of the symbol having given index.
		 *
		 * @param {number} key
		 * @param {string} value
		 */
		set: function(key, value)
		{
			this.value[key] = value;
		},

		/**
		 * Returns current value of the symbol by index.
		 *
		 * @param {number} key
		 * @return {string}
		 */
		get: function(key)
		{
			return this.value[key];
		},

		/**
		 * Event handler.
		 *
		 * @event
		 *
		 * @param {Event} event
		 */
		keydown: function(event)
		{
			if (event.which == 8 || event.which == 46) {

				var key,
					next,
					position = this.resolvePosition();

				if (event.which == 8) {
					key  = this.indexOfWritable(position.end - 1, -1);
					next = this.indexOfWritable(key, -1);
				} else {
					key = this.indexOfWritable(position.start);
					next = this.indexOfWritable(key);
				}

				if (key !== false) {
					this.unset(key);
					this.flush();

					if (next !== false) {
						this.setPosition(next);
					}
				}

				event.preventDefault();
			}
		},

		/**
		 * Event handler.
		 *
		 * @event
		 *
		 * @param {Event} event
		 */
		keypress: function(event)
		{
			var symbol   = String.fromCharCode(event.which),
				position = this.resolvePosition(),
				next,
				key;

			key = this.indexOfWritable(position.start);

			if (key !== false) {
				if (this.test(key, symbol)) {
					this.set(key, symbol);
					this.flush();

					next = this.indexOfWritable(key+1);

					if (next) {
						this.setPosition(next);
					}
				}
			}

			event.preventDefault();
		},

		/**
		 * Tests given symbol having given index.
		 *
		 * @param {number} key
		 * @param {string} symbol
		 *
		 * @return {Boolean}
		 */
		test: function(key, symbol)
		{
			return this.rules.hasOwnProperty(key) && this.rules[key].test(symbol);
		},

		/**
		 * Event handler.
		 *
		 * @event
		 *
		 * @param {Event} event
		 */
		focus: function(event)
		{
			if (this.isEmpty()) {
				this.flush();
                this.setPosition(this.indexOfWritable(0));
			}
		},

		/**
		 * Event handler.
		 *
		 * @event
		 *
		 * @param {Event} event
		 */
		blur: function(event)
		{
			if (this.isEmpty()) {
				this.clear();
			}
		}
	});

	/**
	 * Extending jQuery functions list.
	 *
	 * @param {string} mask
	 * @param {object} [options={}]
	 */
	$.fn.megamask = function(mask, options)
	{
		options = options || {};

		this.data('mask', new Megamask(this, mask, options));
	}

}).call(window, jQuery);