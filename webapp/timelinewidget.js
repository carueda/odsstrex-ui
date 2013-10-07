function TimelineWidget(container, tokenForm) {

    var self = this;

    self.tokenForm = tokenForm;

    var data = [];
    self.tokenInfos = [];
    var tokenInfos = self.tokenInfos;

    self.groups = {};
    var groups = self.groups;

    var oldSelectedIndex = -1;

    var options = {
        'width':            '99%',
        'height':           'auto',
        'editable':         true,
        'style':            'box',
        'snapEvents':       false,
        'eventMargin':      8,
        'eventMarginAxis':  8,
        'showMajorLabels':  true,
        'showMinorLabels':  true,
        'axisOnTop':        true,
        'groupsChangeable': false,
        'showCustomTime':    true
        //'groupsOnRight':    true,
        //'showNavigation':   true,
        //'showButtonNew':    true,
//        'cluster':          true,
    };


    this.timeline = new links.Timeline(container);

//    var now = moment.utc(new Date());
//    this.timeline.setCurrentTime(now.toDate());

    addAddListener();
    addChangeListener();
    addEditListener();
    addResizeListener();
    addSelectListener();



    function getSelectedRow() {
        var row = undefined;
        var sel = self.timeline.getSelection();
        if (sel.length) {
            if (sel[0].row != undefined) {
                row = sel[0].row;
            }
        }
        return row;
    }


    this.reinit = function() {
        self.timeline.deleteAllItems();
        data.lenght = 0;
        tokenInfos.length = 0;
        oldSelectedIndex = -1;
    };


    this.draw = function() {
        self.timeline.draw(data, options);
    };


    this.getVisibleChartRange = function() {
        return self.timeline.getVisibleChartRange();
    };

    this.setVisibleChartRange = function(startDate, endDate) {
        self.timeline.setVisibleChartRange(startDate, endDate, true);
    };

    this.addGroup = function(tml) {
        groups[tml.name] = tml;
        var dummyTokenInfo = {
            'group'       : tml.name
        };
        //console.log("adding dummyTokenInfo " + JSON.stringify(dummyTokenInfo));
        var index = tokenInfos.length;
        tokenInfos.push(dummyTokenInfo);
        pushBlockDummy(dummyTokenInfo);
    };

    this.addToken = function(token) {

        console.log("addToken: " + JSON.stringify(token));

//        var early_start, late_start;
//        if (token.start.value) {
//            early_start = token.start.value;
//            late_start  = token.start.value;
//        }
//        else if (token.start.min) {
//            early_start = token.start.min;
//            late_start  = token.start.max || early_start;
//        }
//        else {
//            late_start  = token.start.max;
//            early_start = late_start;
//        }
//
//        var early_end, late_end;
//        if (token.end.value) {
//            early_end = token.end.value;
//            late_end  = token.end.value;
//        }
//        else if (token.end.min) {
//            early_end = token.end.min;
//            late_end  = token.end.max || early_end;
//        }
//        else {
//            late_end  = token.end.max;
//            early_end = late_start;
//        }
//
//        var tokenInfo = new TokenInfo({
//            'early_start' : parseDate(early_start),
//            'late_start'  : parseDate(late_start),
//
//            'early_end'   : parseDate(early_end),
//            'late_end'    : parseDate(late_end),
//
//            'content'     : token.text,
//            'group'       : token.section_id,
//            'status'      : token.status,
//            'tid'         : token.tid
//        });


        var tokenInfo = token;

        console.log("tokenInfo: " + JSON.stringify(tokenInfo));

        var index = tokenInfos.length;
        tokenInfos.push(tokenInfo);
        pushBlock(tokenInfo, index);
        prepareHover();
    };

    this.redraw = function() {
        self.timeline.redraw();
    };


    function addAddListener() {
        /*
         * Gets info from the timeline generated element to create a new
         * TokenInfo entry; the addition here is actually cancelled and a
         * timed function is used to do the addition of the blocks
         * associated to the new token.
         */
        var onAdd = function(event) {
            if (odsstrexConfig.readonly) {
                pstatus("Addition of new goals is disabled (widget in read-only mode)");
                self.timeline.cancelAdd();
                return;
            }

            var row = getSelectedRow();
            var element = data[row];
            console.log("onAdd: row=" +row+ " element=" +JSON.stringify(element));

            var now = new Date();
            if (element.start < now) {
                pstatus("new goal in the past cannot be added");
                self.timeline.cancelAdd();
                return;
            }

            var name = strip(element.group);
            var tml = groups[name];
            console.log("onAdd: name=" +name+ " tml.accept_goals=" +JSON.stringify(tml.accept_goals));

            if (!tml.accept_goals) {
                pstatus("This timeline does not accept new goals");
                self.timeline.cancelAdd();
                return;
            }

            // incr: helps make the new token length be somewhat
            // proportional to the current visible range
            var incr = 60*60*1000; // by default 1 hr (arbitrarily chosen)
            var vis = self.timeline.getVisibleChartRange();
            var visLen = vis.end.valueOf() - vis.start.valueOf();
            if (visLen > 0) {
                incr = (visLen / 4) / 4;
            }

            var addNewToken = function () {

                console.log("addNewToken: element=" +JSON.stringify(element));

                var early_start = element.start.valueOf();

                var tokenInfo = new TokenInfo({
                    'start' : {
                        'min' : new Date(early_start),
                        'max' : new Date(early_start +   incr)
                    },

                    'end'   : {
                        'min' : new Date(early_start + 3*incr),
                        'max' : new Date(early_start + 4*incr)
                    },

                    'duration'   : {
                        'min'   : undefined,
                        'max'   : undefined,
                        'value' : undefined
                    },

                    'text'         : "Track",   //element.content,
                    'section_id'   : element.group
                });

                console.log("adding token " + JSON.stringify(tokenInfo));
                var index = tokenInfos.length;
                tokenInfos.push(tokenInfo);
                pushBlock(tokenInfo, index);
                prepareHover();
                self.draw();

                showTokenForm(index, tokenInfo);
            };

            // 100 works fine in Chrome but not in Firefox/Safari: just set it
            // a bit longer:
            setTimeout(addNewToken, 200);

            self.timeline.cancelAdd();
        };

        links.events.addListener(self.timeline, 'add', onAdd);
    }

    function showTokenForm(index, tokenInfo) {
        self.tokenForm.showForm({
            tokenInfo: tokenInfo
//            ,
//
//            accept: function() {
//                tokenInfos.push(tokenInfo);
//                pstatus("TODO: accept goal");
//                // TODO validations
//            },
//            cancel: function() {
//                self.timeline.deleteItem(index);
//            }
        });
    }


    function addChangeListener() {

        function cancelChange(index, tokenInfo, msg) {
            pstatus(msg);

            self.timeline.cancelChange();

            var bodyBlock  = data[index];

            bodyBlock.start  = tokenInfo.early_start ;
            bodyBlock.end    = tokenInfo.late_end  ;
        }

        function blockWidth(block) {
            return block.end - block.start;
        }


        var onChange = function(event) {
            var originalDiff, newDiff, diffDiff, delta;

            var row = getSelectedRow();
            var element = data[row];
            console.log("data[row] = " + JSON.stringify(element));
            if (element == undefined) {
                return;
            }

            var index = element.tokenInfo.index;
            var kind  = element.tokenInfo.kind;
            var tokenInfo = tokenInfos[index];

            console.log("tokenInfo: " + JSON.stringify(tokenInfo));

            if (tokenInfo.status === "status_accepted") {
                cancelChange(index, tokenInfo, "Accepted token cannot be changed");
                return;
            }

            var bodyBlock  = data[index];

            console.log("bodyBlock:  " + JSON.stringify(bodyBlock));

            var now = new Date();

            assert(kind === "body", "block kind must be body");

            if (bodyBlock.start < now) {
                cancelChange(index, tokenInfo, "token cannot be in the past");
                return;
            }

            tokenInfo.early_start = bodyBlock.start;
            tokenInfo.late_start  = bodyBlock.start;
            tokenInfo.early_end   = bodyBlock.end;
            tokenInfo.late_end    = bodyBlock.end;

            updateStatusModified(index, tokenInfo);

            prepareHover();
            self.redraw();
        };

        links.events.addListener(self.timeline, 'change', onChange);
    }

    this.updateStatus = function(index, tokenInfo, status) {
        tokenInfo.status = status;

        var bodyBlock  = data[index];

        bodyBlock .className = "block-body"  + " " + status;

        self.timeline.redraw();
    }

    function updateStatusModified(index, tokenInfo) {
        if (tokenInfo.status === "status_new") {
            return;
        }
        else if (tokenInfo.status === "status_new_saved") {
            self.updateStatus(index, tokenInfo, "status_new_modified");
        }
        else if (tokenInfo.status.match(/.*_modified/)) {
            return;
        }
        else {
            self.updateStatus(index, tokenInfo, tokenInfo.status + "_modified");
        }
        console.log("modifed status set to: " + tokenInfo.status);
    }


    function addEditListener() {
        var onEdit = function(event) {
            //console.log("onEdit: " + JSON.stringify(event));
            var row = getSelectedRow();
            var element = data[row];
            console.log("data[" + row + "] = " + JSON.stringify(element));

            var index = element.tokenInfo.index;
            var tokenInfo = tokenInfos[index];

            self.tokenForm.showForm({tokenInfo: tokenInfo});
        };

        links.events.addListener(self.timeline, 'edit', onEdit);
    }


    function addSelectListener() {
        var onSelect = function(event) {
            var row = getSelectedRow();
            if (oldSelectedIndex >= 0) {
                deselect(oldSelectedIndex);
                oldSelectedIndex = -1;
            }
            if (row) {
                console.log("onSelect (" +oldSelectedIndex+ "): " + JSON.stringify(data[row]));
                var newIndex = data[row].tokenInfo.index;
                select(newIndex);
                oldSelectedIndex = newIndex;
                self.timeline.selectItem(row);
            }
        };

        links.events.addListener(self.timeline, 'select', onSelect);
    }

    function addResizeListener() {
        $(window).bind('resize', function() {
            self.timeline.redraw();
        });
    }



    function select(index) {
        // nothing to do.
    }

    function deselect(index) {
        // nothing to do.
    }

    function addClassBlock(block, clazz) {
        var classes = block.className.split(" ");
        var index = classes.indexOf(clazz);
        if (index < 0 ) {
            classes.push(clazz);
        }
        block.className = classes.join(" ");
//        console.log("AFTER ADD'" +block.className+ "'");
    }

    function removeClassBlock(block, clazz) {
        var classes = block.className.split(/\s+/);
        var index = classes.indexOf(clazz);
        if (index >= 0) {
            delete classes[index];
        }
        block.className = classes.join(" ");
//        console.log("AFTER REMOVE '" +block.className+ "'");
    }

    function addClass(index, clazz) {
        var bodyBlock  = data[index];

        addClassBlock(bodyBlock , clazz);

        self.timeline.redraw();
    }

    function removeClass(index, clazz) {
        var bodyBlock  = data[index ];

        removeClassBlock(bodyBlock , clazz);

        self.timeline.redraw();
    }


    function formattedGroup(name) {
        name = strip(name);
        var tml = groups[name];
        var tooltip, color;
        if (tml === undefined) {
            color = "yellow"; // should not happen
        }
        else {
            tooltip = "Timeline: <b>" + tml.name + "</b>";
            tooltip += "<br/><br/>";
            tooltip += "<table>";
            for (var key in tml) {
                (function(key) {
                    if (key === "name") {
                        return;
                    }
                    var v = tml[key];
                    tooltip += "<tr><td><b>" +key + "</b>:</td><td>" +v+ "</td></tr>";
                })(key);
            }
            tooltip += "</table>";
            color = !tml.alive ? "red" : tml.accept_goals ? "green" : "black";
        }
        return "<div style='color: " +color+ "' title='" +tooltip+ "'>" + name + "</div>";
    }

    function getTokenTooltip(token) {
        var dic = {
            start:   token.start,
            end:     token.end,
            duration:     token.duration
        };
        for (var ii = 0, ll = token.vars.length; ii < ll; ii++) {
            var variable = token.vars[ii];
            var name = variable.name;
            if (name) {
                dic[name] = variable;
            }
        }
        return tablify(dic);
    }

    function getTokenContent(token) {
        var tooltip = "Token predicate: <b>" + token.text + "</b> " +
                "on timeline: <b>" + token.section_id + "</b>";
        tooltip += "<br/><br/>" + getTokenTooltip(token);
        //console.log("tootip = " + tooltip);
        var content = "<div title='" +tooltip+ "'>" +token.text+ "</div>";
        return content;
    }

    function pushBlock(token, index) {

        // TODO determine what values to use if none of the 3 options is given

        var start = token.start.value || token.start.min || token.start.max;
        var end   = token.end.value   || token.end.max   || token.end.min;

        var body = {
            'start':      parseDate(start),
            'end':        parseDate(end),

            'content':    getTokenContent(token),
            'group':      formattedGroup(token.section_id),
            'className':  token.status + " " + "block-body",
            'tokenInfo':  {'kind': 'body', 'index': index}
        };

        data.push(body);
    }

    function pushBlockDummy(tokenInfo) {
        var body = {
            'group': formattedGroup(tokenInfo.group)
        };
        data.push(body);
    }

    function pushBlock_OLD(tokenInfo, index) {

        // note: blocks always editable even for accepted tokens because the
        // widget restricts too much if we indicate editable=false.

        var body = {
            'start':      tokenInfo.early_start,
            'end':        tokenInfo.late_end,
            'content':    tokenInfo.content,
            'group':      formattedGroup(tokenInfo.group),
            'className':  tokenInfo.status + " " + "block-body",
            'tokenInfo':  {'kind': 'body', 'index': index}
        };

        data.push(body);
    }

}
