var Range = ace.require("ace/range").Range;

function installRegexpFindDependency(regexpEditor, textEditor, matchesResult, groupTable) {
    var marker = {
        id: 'regexTextFindMarked',

        update: function (html, markerLayer, session, config) {
            var regex = regexpEditor.regex
            if (!regex) return

            var start = config.firstRow, end = config.lastRow;

            var text = session.getValue()

            var r;

            regex.lastIndex = 0

            var matchCount = 0

            var currentMatchResult
            var currentMatchResultRange
            var lastMatchResult

            var cursorPos = session.getSelection().getCursor()

            while (r = regex.exec(text)) {
                if (r[0].length == 0) {
                    break // regexp is empty
                }

                var startPos = session.getDocument().indexToPosition(r.index)
                var endPos = session.getDocument().indexToPosition(r.index + r[0].length)

                var range = Range.fromPoints(startPos, endPos)

                drawLineMarker(markerLayer, html, range, session, (matchCount & 1) ? 'matched2' : 'matched1', config)

                matchCount++
                lastMatchResult = r

                if (!regex.global) {
                    break
                } else {
                    if (range.contains(cursorPos.row, cursorPos.column)) {
                        currentMatchResult = r
                        currentMatchResultRange = range
                    }
                }
            }

            if (matchesResult) {
                var matchResultText

                if (matchCount == 0) {
                    matchResultText = "No matches"
                } else {
                    if (regex.global) {
                        matchResultText = matchCount + " matches found"
                    } else {
                        matchResultText = ""
                    }
                }

                matchesResult.text(matchResultText)
            }

            if (groupTable) {
                if (matchCount == 0) {
                    $('td:last-child', groupTable).html("<span class='spec'>No matches found<span>")
                } else {
                    if (matchCount == 1) {
                        currentMatchResult = lastMatchResult
                        currentMatchResultRange = range
                    }

                    if (currentMatchResultRange) {
                        drawLineMarker(markerLayer, html, currentMatchResultRange, session, 'currentMatchResult', config)
                    }

                    if (currentMatchResult) {
                        var groupRows = groupTable.groupRows
                        if (groupRows) {
                            for (var i = 0; i < groupRows.length; i++) {
                                var tr = groupRows[i]

                                var s = currentMatchResult[i]
                                if (s == undefined || s == null) {
                                    $('td:last-child', tr).html("<span class='spec'>null<span>")
                                } else {
                                    $('td:last-child', tr).empty().append($("<span class='groupText'></span>").text(s))
                                }

                            }
                        }
                    } else {
                        $('td:last-child', groupTable).html("<span class='spec'>please, move the cursor to matched text<span>")
                    }

                }
            }
        }
    }

    textEditor.getSession().addDynamicMarker(marker)

    textEditor.on("change", function () {
        textEditor.onChangeBackMarker()
    })
    textEditor.getSession().selection.on('changeCursor', function () {
        textEditor.onChangeBackMarker()
    })

    function fixGroupCount() {
        if (groupTable) {
            var bracketStructure = regexpEditor.session.bracketStructure

            var groupRows = groupTable.groupRows
            if (groupRows == undefined) {
                groupTable.groupRows = groupRows = []
                groupRows.push($("tr", groupTable))

                groupRows[0].mouseenter(function () {
                    regexpEditor.setHighlightedGroup(0)
                })
            }

            if (groupRows.length != bracketStructure.groups.length + 1) {
                if (groupRows.length > bracketStructure.groups.length + 1) {
                    while (groupRows.length > bracketStructure.groups.length + 1) {
                        groupRows.pop().remove()
                    }
                } else {
                    for (var i = groupRows.length; i < bracketStructure.groups.length + 1; i++) {
                        var e = $("<tr><td>#" + i + "</td><td></td></tr>")
                        groupTable.append(e)
                        groupRows.push(e)

                        e[0].groupIndex = i

                        e.mouseenter(function () {
                            regexpEditor.setHighlightedGroup(this.groupIndex)
                        })
                    }
                }
            }
        }
    }

    regexpEditor.addRegexChangeListener(function () {
        textEditor.onChangeBackMarker()
        fixGroupCount()
    })

    fixGroupCount()

    if (groupTable) {
        regexpEditor.matchedBracketMarker.addSelectedGroupListener(function () {
            var selectedGroupIndex = regexpEditor.matchedBracketMarker.selectedGroupIndex

            var groupRows = groupTable.groupRows

            for (var i = 0; i < groupRows.length; i++) {
                groupRows[i].removeClass('selectedGroupTr');
            }

            if (selectedGroupIndex) {
                groupRows[selectedGroupIndex].addClass('selectedGroupTr')
            }
        })

        groupTable.mouseleave(function () {
            regexpEditor.setHighlightedGroup(undefined)
        })
    }

    textEditor.onChangeBackMarker()
}

define('ace/mode/regexp',
    ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/tokenizer', 'ace/mode/regexp_highlight_rules'],
    function (require, exports, module) {

        var oop = require("../lib/oop");
        var TextMode = require("./text").Mode;
        var Tokenizer = require("../tokenizer").Tokenizer;
        var RegexpFileHighlightRules = require("./regexp_highlight_rules").RegexpFileHighlightRules;

        var Mode = function () {
            this.HighlightRules = RegexpFileHighlightRules;
        };
        oop.inherits(Mode, TextMode);

        (function () {
            this.lineCommentStart = "";
            this.blockComment = "";
            this.$id = "ace/mode/regexp";
        }).call(Mode.prototype);

        exports.Mode = Mode;
    });

define('ace/mode/regexp_highlight_rules', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'],
    function (require, exports, module) {


        var oop = require("../lib/oop");
        var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

        var RegexpFileHighlightRules = function () {

            this.$rules = {
                "#atom": [
                    {
                        token: "dote",
                        regex: /\./,
                        next: "afterAtom",
                        merge: false
                    },

                    {
                        token: ['numEsc', 'controlLetter', 'controlEsc'],
                        regex: /(\\(?:0[1-9][0-9]*|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}))|(\\c[a-zA-Z])|(\\[fnrtv])/,
                        next: "afterAtom",
                        merge: false
                    },

                    {
                        token: 'groupRef',
                        regex: /\\[1-9][0-9]*/,
                        next: "afterAtom",
                        merge: false
                    },

                    {
                        token: 'charClassEsc',
                        regex: /\\[sSdDwW]/,
                        next: "afterAtom",
                        merge: false
                    },
                    {
                        token: ['escapeSymbol', 'escapedSymbol'],
                        regex: /(\\)([^bB])/,
                        next: "afterAtom",
                        merge: false
                    },

                    {
                        token: "defText",
                        regex: /[^\^\$\\\.\|\*\+\?\(\)\[\/]/,
                        next: "afterAtom",
                        merge: false
                    }
                ],

                "#term": [
                    {include: "#atom"},

                    {
                        token: "assertion",
                        regex: /\^|\$|\\b|\\B/,
                        next: "start",
                        merge: false
                    },

                    {
                        token: 'orSymbol',
                        regex: /\|/,
                        next: "start",
                        merge: false
                    },

                    {
                        token: 'openBracket',
                        regex: /\((?:\?[:=!])?/,
                        next: "start",
                        merge: false
                    },

                    {
                        token: 'closedBracket',
                        regex: /\)/,
                        next: "afterAtom",
                        merge: false
                    },

                    {
                        token: "error",
                        regex: /\[\^?\]/,
                        next: "afterAtom"
                    },

                    {
                        token: "charClassStart",
                        regex: /\[\^?/,
                        next: "charClassStart"
                    }
                ],

                start: [
                    {include: "#term"},

                    {
                        token: 'error',
                        regex: /[*+?]|\{\d+(?:,\d*)?\}\??/,
                        next: "start"
                    },

                    {
                        token: 'error',
                        regex: /./
                    }
                ],

                afterAtom: [
                    {
                        token: 'quantifier',
                        regex: /(?:[*+?]|\{\d+(?:,\d*)?\})\??/,
                        next: "start",
                        merge: false
                    },

                    {include: "#term"},

                    {
                        token: 'error',
                        regex: /./
                    }
                ],

                "#charClassAtom": [
                    {
                        token: 'charClassEsc',
                        regex: /\\[sSdDwW]/,
                        next: "charClassStart",
                        merge: false
                    },

                    {
                        token: ['charClassAtom', 'numEsc', 'controlLetter', 'controlEsc', 'escapeSymbol', 'escapedSymbol'],
                        regex: /([^\]\\])|(\\(?:[0-9]+|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}))|(\\c[a-zA-Z])|(\\[fnrtv])|(\\)(.)/,
                        next: "charClassAfterAtom",
                        merge: false
                    },

                    {
                        token: 'charClassEnd',
                        regex: /]/,
                        next: "afterAtom",
                        merge: false
                    }
                ],

                charClassStart: [
                    {
                        include: "#charClassAtom"
                    }
                ],

                charClassAfterAtom: [
                    {
                        token: ['charClassRange', 'charClassAtom', 'numEsc', 'controlLetter', 'controlEsc', 'escapeSymbol', 'escapedSymbol'],
                        regex: /(-)(?:([^\]\\])|(\\(?:[0-9]+|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}))|(\\c[a-zA-Z])|(\\[fnrtv])|(\\)([^sSdDwW]))/,
                        next: "charClassStart",
                        merge: false
                    },

                    {
                        include: "#charClassAtom"
                    }
                ]
            }

            this.normalizeRules();
        };

        oop.inherits(RegexpFileHighlightRules, TextHighlightRules);

        exports.RegexpFileHighlightRules = RegexpFileHighlightRules;
    });

define('ess/regex/related_elements_marker', ['ace/token_iterator', 'ace/range'], function (require, exports, module) {
    "use strict";

    var TokenIterator = require('ace/token_iterator').TokenIterator
    var Range = ace.require('ace/range').Range;

    function orSymbolRelatedElementFinder(itr, t, consumer) {
        var range = 0
        var savedItrState = saveTokenIteratorState(itr)

        var lastOr = t;
        lastOr.row = itr.getCurrentTokenRow()

        do {
            var currentToken = itr.stepBackward()
            if (!currentToken) break

            if (currentToken.type == 'openBracket') {
                if (range == 0) {
                    break
                } else {
                    range--
                }
            } else if (currentToken.type == 'closedBracket') {
                range++
            } else if (range == 0 && currentToken.type == 'orSymbol') {
                var column = itr.getCurrentTokenColumn()
                var currentTokenRow = itr.getCurrentTokenRow();
                currentToken.start = column
                currentToken.row = currentTokenRow

                consumer(new Range(currentTokenRow, column + currentToken.value.length, lastOr.row, lastOr.start))

                lastOr = currentToken
            }
        } while (true)

        itr.stepForward()

        consumer(new Range(itr.getCurrentTokenRow(), itr.getCurrentTokenColumn(), lastOr.row, lastOr.start))

        // Go forward
        loadTokenIteratorState(itr, savedItrState)

        lastOr = t;
        range = 0
        do {
            currentToken = itr.stepForward()
            if (!currentToken) break

            if (currentToken.type == 'openBracket') {
                range++
            } else if (currentToken.type == 'closedBracket') {
                if (range == 0) {
                    break
                } else {
                    range--
                }
            } else if (range == 0 && currentToken.type == 'orSymbol') {
                column = itr.getCurrentTokenColumn()
                currentTokenRow = itr.getCurrentTokenRow();
                currentToken.start = column
                currentToken.row = currentTokenRow

                consumer(new Range(lastOr.row, lastOr.start + lastOr.value.length, currentTokenRow, column))

                lastOr = currentToken
            }
        } while (true)

        itr.stepBackward()

        consumer(new Range(lastOr.row, lastOr.start + lastOr.value.length,
            itr.getCurrentTokenRow(), itr.getCurrentTokenColumn() + itr.getCurrentToken().value.length))
    }

    function quantifierRelatedElementFinder(itr, t, consumer) {
        t.row = itr.getCurrentTokenRow()

        var range = 0

        do {
            var currentToken = itr.stepBackward()
            if (!currentToken) {
                itr.stepForward()
                break
            }

            if (currentToken.type == 'escapedSymbol') {
                currentToken = itr.stepBackward()
                if (!currentToken) {
                    itr.stepForward()
                    break
                }
            }

            if (currentToken.type == 'openBracket') {
                if (range == 0) {
                    itr.stepForward()
                    break
                } else {
                    range--
                }
            } else if (currentToken.type == 'closedBracket') {
                range++
            }
        } while (range > 0)

        consumer(new Range(itr.getCurrentTokenRow(), itr.getCurrentTokenColumn(), t.row, t.start))
    }

    function groupReferenceRelatedElementFinder(itr, t, consumer, session) {
        var bracketStructure = session.bracketStructure
        if (!bracketStructure) return

        var groupNumber = parseInt(t.value.substring(1))
        var br = bracketStructure.groups[groupNumber - 1]
        if (!br) return

        var closedBr = br.pair

        if (closedBr.row > itr.getCurrentTokenRow() || (closedBr.row == itr.getCurrentTokenRow() && closedBr.column > t.start)) {
            return
        }

        consumer(new Range(br.row, br.column, closedBr.row, closedBr.end))
    }

    var supportedRelatedElements = {
        orSymbol: orSymbolRelatedElementFinder,
        quantifier: quantifierRelatedElementFinder,
        groupRef: groupReferenceRelatedElementFinder
    }

    var RelatedElementMarker = function (regexpEditor) {
        this.update = function (html, markerLayer, session, config) {
            if (!regexpEditor.isFocused()) return

            var cursorPos = session.getSelection().getCursor()

            var t = session.getTokenAt(cursorPos.row, cursorPos.column + 1)

            if (!t || (!supportedRelatedElements.hasOwnProperty(t.type))) {
                if (cursorPos.column == 0) {
                    return
                }

                t = session.getTokenAt(cursorPos.row, cursorPos.column)

                if (!t || (!supportedRelatedElements.hasOwnProperty(t.type))) {
                    return
                }
            }

            var itr = new TokenIterator(session, cursorPos.row, t.start + 1)

            supportedRelatedElements[t.type](itr, t, function (range) {
                if (!range.isEmpty()) {
                    drawLineMarker(markerLayer, html, range, session, 'relatedToken', config)
                }
            }, session)
        }
    };

    //(function() {
    //
    //}).call(RelatedElementMarker.prototype);

    exports.RelatedElementMarker = RelatedElementMarker;
});

define('ess/regex/my_token_iterator', [], function (require, exports, module) {
    "use strict";

    var MyTokenIterator = function (session, initialRow) {
        this.$session = session;
        this.$row = initialRow;
        this.$rowTokens = session.getTokens(initialRow);
        this.$column = 0

        while (this.$rowTokens.length == 0 && this.$row < session.getLength() - 1) {
            this.$row++
            this.$rowTokens = session.getTokens(this.$row);
        }

        var token = this.$rowTokens[0];
        this.$tokenIndex = token ? 0 : -1;
    };

    (function () {

        this.stepForward = function () {
            var t = this.$rowTokens[this.$tokenIndex]
            if (t) {
                this.$column += t.value.length
            }

            this.$tokenIndex += 1;

            var rowCount;
            while (this.$tokenIndex >= this.$rowTokens.length) {
                this.$row += 1;
                if (!rowCount)
                    rowCount = this.$session.getLength();
                if (this.$row >= rowCount) {
                    this.$row = rowCount - 1;
                    return null;
                }

                this.$rowTokens = this.$session.getTokens(this.$row);
                this.$tokenIndex = 0;
                this.$column = 0;
            }

            return this.$rowTokens[this.$tokenIndex];
        };

        /**
         *
         * Returns the current tokenized string.
         * @returns {String}
         **/
        this.getCurrentToken = function () {
            return this.$rowTokens[this.$tokenIndex];
        };

        this.getCurrentTokenRow = function () {
            return this.$row;
        };

        this.getCurrentTokenColumn = function () {
            return this.$column;
        };

        /**
         *
         * Returns the current column.
         * @returns {Number}
         **/
        this.getCurrentTokenColumn = function () {
            var rowTokens = this.$rowTokens;
            var tokenIndex = this.$tokenIndex;

            // If a column was cached by EditSession.getTokenAt, then use it
            var column = rowTokens[tokenIndex].start;
            if (column !== undefined)
                return column;

            column = 0;
            while (tokenIndex > 0) {
                tokenIndex -= 1;
                column += rowTokens[tokenIndex].value.length;
            }

            return column;
        };

    }).call(MyTokenIterator.prototype);

    exports.MyTokenIterator = MyTokenIterator;
});

define('ess/regex/regex_api', [], function (require, exports, module) {
    "use strict";

    var TokenIterator = require('ace/token_iterator').TokenIterator
    var Range = ace.require("ace/range").Range;
    var RelatedElementMarker = require('ess/regex/related_elements_marker').RelatedElementMarker
    var MyTokenIterator = require("ess/regex/my_token_iterator").MyTokenIterator;


    function installRegexEditorApi(regexpEditor) {
        var regex_change_listeners = []

        regexpEditor.addRegexChangeListener = function (listener) {
            regex_change_listeners.push(listener)
        }

        regexpEditor.setHighlightedGroup = function (groupIndex) {
            if (regexpEditor.$highlightedGroupIndex != groupIndex) {
                regexpEditor.$highlightedGroupIndex = groupIndex
                regexpEditor.onChangeBackMarker()
            }
        }

        var onRegexChange = function () {
            var regexText = regexpEditor.getValue()

            var flags = regexpEditor.regex_flags
            if (!flags) flags = ""

            if (regexText == regexpEditor.old_regex_text && flags == regexpEditor.regex_old_flags) return

            regexpEditor.old_regex_text = regexText
            regexpEditor.regex_old_flags = flags

            regexpEditor.session.bracketStructure = evaluateBracketStructure(regexpEditor.session)

            var regex = null;
            try {
                regex = new RegExp(regexText, flags);
            } catch (e) {
            }

            regexpEditor.regex = regex

            sendNotification(regex_change_listeners)
        }

        regexpEditor.on("change", function () {
            onRegexChange()
        })

        regexpEditor.setFlags = function (flags) {
            regexpEditor.regex_flags = flags
            onRegexChange()
        }

        onRegexChange()

        installRegexpHighlighter(regexpEditor)
    }

    function evaluateBracketStructure(session) {
        var groups = []
        var brackets = []

        var itr = new MyTokenIterator(session, 0)

        var openBrackets = []

        var t = itr.getCurrentToken()
        while (t) {
            if (t.type == 'charClassStart') {
                var br = {
                    row: itr.getCurrentTokenRow(),
                    column: itr.getCurrentTokenColumn(),
                    end: itr.getCurrentTokenColumn() + t.value.length
                }

                brackets.push(br)

                while (t = itr.stepForward()) {
                    if (t.type == 'charClassEnd') {
                        var closedBr = {
                            row: itr.getCurrentTokenRow(),
                            column: itr.getCurrentTokenColumn(),
                            end: itr.getCurrentTokenColumn() + 1
                        }

                        closedBr.pair = br
                        br.pair = closedBr

                        brackets.push(closedBr)
                        break
                    }
                }
            } else if (t.type == 'openBracket') {
                br = {
                    row: itr.getCurrentTokenRow(),
                    column: itr.getCurrentTokenColumn(),
                    end: itr.getCurrentTokenColumn() + t.value.length
                }
                brackets.push(br)
                openBrackets.push(br)

                if (t.value == '(') {
                    br.captureGroup = true
                }
            } else if (t.type == 'closedBracket') {
                closedBr = {
                    row: itr.getCurrentTokenRow(),
                    column: itr.getCurrentTokenColumn(),
                    end: itr.getCurrentTokenColumn() + 1
                }

                brackets.push(closedBr)

                if (openBrackets.length > 0) {
                    br = openBrackets.pop()

                    br.pair = closedBr
                    closedBr.pair = br

                    if (br.captureGroup) {
                        groups.push(br)
                        closedBr.captureGroup = br.captureGroup = groups.length
                    }
                }
            }

            t = itr.stepForward()
        }

        return {
            groups: groups,
            brackets: brackets
        }
    }

    function installFlagsCheckboxListener(regexpEditor, checkboxes) {

        var rereadFlags = function () {
            var flags = ""

            for (var i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checked) {
                    flags += $(checkboxes[i]).attr('flagValue')
                }
            }

            regexpEditor.setFlags(flags)
        }

        checkboxes.each(function () {
            $(this).change(function () {
                rereadFlags()
            })
        })

        rereadFlags()
    }

    function installRegexpHighlighter(regexpEditor) {
        regexpEditor.matchedBracketMarker = new MatchedBracketMarker(regexpEditor)
        regexpEditor.getSession().addDynamicMarker(regexpEditor.matchedBracketMarker)
        regexpEditor.getSession().addDynamicMarker(new InvalidBracketMarker())
        regexpEditor.getSession().addDynamicMarker(new RelatedElementMarker(regexpEditor), true)
        regexpEditor.getSession().addDynamicMarker(new SelectedGroupHighlighter(regexpEditor))

        regexpEditor.on("change", function () {
            regexpEditor.onChangeBackMarker()
            regexpEditor.onChangeFrontMarker()
        })

        regexpEditor.on("focus", function () {
            regexpEditor.onChangeBackMarker()
            regexpEditor.onChangeFrontMarker()
        })

        regexpEditor.on("blur", function () {
            regexpEditor.onChangeBackMarker()
            regexpEditor.onChangeFrontMarker()
        })

        regexpEditor.getSession().selection.on('changeCursor', function () {
            regexpEditor.onChangeBackMarker()
            regexpEditor.onChangeFrontMarker()
        })
    }

    function SelectedGroupHighlighter(regexpEditor) {
        this.update = function (html, markerLayer, session, config) {
            var groupIndex = regexpEditor.$highlightedGroupIndex
            if (groupIndex == undefined || !session.bracketStructure) return

            if (groupIndex == 0) {
                var lastRow = regexpEditor.session.getLength() - 1
                drawLineMarker(markerLayer, html,
                    new Range(0, 0, lastRow, regexpEditor.session.getLine(lastRow).length),
                    session, 'selectedGroupMarker', config)
            } else {
                var br = session.bracketStructure.groups[groupIndex - 1]
                if (!br) return

                var range = new Range(br.row, br.column, br.pair.row, br.pair.end)
                drawLineMarker(markerLayer, html, range, session, 'selectedGroupMarker', config)
            }
        }
    }

    function MatchedBracketMarker(regexpEditor) {
        this.$selectedGroupListeners = []
        this.addSelectedGroupListener = function (l) {
            this.$selectedGroupListeners.push(l)
        }

        this.update = function (html, markerLayer, session, config) {
            if (!session.bracketStructure) return

            var bracketUnderCaret

            if (regexpEditor.isFocused()) {
                var cursorPos = session.getSelection().getCursor()
                var caretColumn = cursorPos.column

                var brackets = session.bracketStructure.brackets

                for (var i = 0; i < brackets.length; i++) {
                    var br = brackets[i]

                    if (br.end < caretColumn) continue

                    if (cursorPos.row < br.row) continue
                    if (cursorPos.row > br.row) break

                    if (caretColumn < br.column) break

                    if (br.pair) {
                        bracketUnderCaret = br
                    }
                }
            }

            var selectedGroupIndex

            if (bracketUnderCaret) {
                var row = bracketUnderCaret.row
                if (row >= config.firstRow && row <= config.lastRow) {
                    var range = new Range(row, bracketUnderCaret.column, row, bracketUnderCaret.end)
                    markerLayer.drawSingleLineMarker(html, range.toScreenRange(session), 'matchedBracket', config);
                }

                var pairRow = bracketUnderCaret.pair.row
                if (pairRow >= config.firstRow && pairRow <= config.lastRow) {
                    range = new Range(row, bracketUnderCaret.pair.column, row, bracketUnderCaret.pair.end)
                    markerLayer.drawSingleLineMarker(html, range.toScreenRange(session), 'matchedBracket', config);
                }

                selectedGroupIndex = bracketUnderCaret.captureGroup
            }

            if (this.selectedGroupIndex != selectedGroupIndex) {
                this.selectedGroupIndex = selectedGroupIndex
                sendNotification(this.$selectedGroupListeners)
            }
        }
    }

    function InvalidBracketMarker() {
        this.update = function (html, markerLayer, session, config) {
            if (!session.bracketStructure) return

            var brackets = session.bracketStructure.brackets

            for (var i = 0; i < brackets.length; i++) {
                var br = brackets[i]
                if (!br.pair) {
                    var row = br.row
                    if (row >= config.firstRow && row <= config.lastRow) {
                        var range = new Range(row, br.column, row, br.end)
                        markerLayer.drawSingleLineMarker(html, range.toScreenRange(session), 'unmatchedBracket', config);
                    }
                }
            }
        }
    }

    exports.installRegexEditorApi = installRegexEditorApi
    exports.installFlagsCheckboxListener = installFlagsCheckboxListener
})