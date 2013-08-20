function TimelineWidget(container) {

    var self = this;

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
        'showNavigation':   true,
        //'showButtonNew':    true,
//        'cluster':          true,
        'showMajorLabels':  true,
        'showMinorLabels':  true,
        'axisOnTop':        true,
        'groupsChangeable': false
        //'groupsOnRight':    true,
        //'showCustomTime':    true
    };


    this.timeline = new links.Timeline(container);

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
        pushBlock(dummyTokenInfo, index, data);
    };

    this.addToken = function(token) {
        var tokenInfo = new TokenInfo({
            'early_start' : parseDate(token.early_start),
            'late_start'  : parseDate(token.late_start),
            'early_end'   : parseDate(token.early_end),
            'late_end'    : parseDate(token.late_end),
            'content'     : token.text,
            'group'       : token.section_id,
            'status'      : token.status,
            'tid'         : token.tid
        });

        var index = tokenInfos.length;
        tokenInfos.push(tokenInfo);
        pushBlock(tokenInfo, index, data);
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
            var row = getSelectedRow();
            var element = data[row];
            console.log("onAdd: row=" +row+ " element=" +JSON.stringify(element));


            var name = strip(element.group);
            var tml = groups[name];
            console.log("tml.accept_goals=" +JSON.stringify(tml.accept_goals));

            if (!tml.accept_goals) {
                pstatus("This timeline does not accept new goals");
                self.timeline.cancelAdd();
                return;
            }

            // incr: helps make the new token length be somewhat
            // proportional to the current visible range
            var incr;
            var vis = self.timeline.getVisibleChartRange();
            var visLen = vis.end - vis.start;
            if (visLen > 0) {
                incr = visLen / 3 / 4;
            }
            else {
                incr = 60*60*1000; // 1 hr (arbitrarily chosen)
            }

            if (element.start <= new Date().valueOf()) {
                pstatus("new goal in the past cannot be added");
                self.timeline.cancelAdd();
                return;
            }

            var addToken = function () {
                var early_start = element.start.valueOf();
                var tokenInfo = new TokenInfo({
                    'early_start' : new Date(early_start),
                    'late_start'  : new Date(early_start +   incr),
                    'early_end'   : new Date(early_start + 3*incr),
                    'late_end'    : new Date(early_start + 4*incr),
                    'content'     : element.content,
                    'group'       : element.group
                });
                console.log("adding token " + JSON.stringify(tokenInfo));
                var index = tokenInfos.length;
                tokenInfos.push(tokenInfo);
                pushBlock(tokenInfo, index, data);
                prepareHover();
                self.redraw();
            };

            setTimeout(addToken, 100);

            self.timeline.cancelAdd();
        };

        links.events.addListener(self.timeline, 'add', onAdd);
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

//            var content = strip(data[row].content);
//            var newContent = prompt("Enter content\n", content);
//            if (newContent != undefined) {
//                data[row].content = newContent;
//                tokenInfo.content = newContent;
//                self.timeline.redraw();
//            }

            editFormShow(index, tokenInfo);
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
            tooltip = "";
            for (var k in tml) {
                tooltip += k + ": " +tml[k]+ " \n";
            }
            color = tml.accept_goals ? "blue" : "black";
        }
        return "<div style='color: " +color+ "' title='" +tooltip+ "'>" + name + "</div>";
    }

    function pushBlock(tokenInfo, index, data) {

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
