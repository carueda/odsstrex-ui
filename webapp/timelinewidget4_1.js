function TimelineWidget(container) {

    var self = this;

    var data = [];
    self.tokenInfos = [];
    var tokenInfos = self.tokenInfos;

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
        //'cluster':          true,
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
        var name = tml.name;

//        if (!tml.accept_goals) {
//            name = "<div style='color: red'>" + name + "</div>";
//        }

        var dummyTokenInfo = {
            'group'       : name
        };
        //console.log("adding dummyTokenInfo " + JSON.stringify(dummyTokenInfo));
        var index = tokenInfos.length;
        tokenInfos.push(dummyTokenInfo);
        pushBlocks(dummyTokenInfo, index, data);
    };

    this.addToken = function(token) {
        var tokenInfo = {
            'early_start' : parseDate(token.early_start),
            'late_start'  : parseDate(token.late_start),
            'early_end'   : parseDate(token.early_end),
            'late_end'    : parseDate(token.late_end),
            'content'     : token.text,
            'group'       : token.section_id,
            'status'      : token.status,
            'tid'         : token.tid
        };

        var index = tokenInfos.length;
        tokenInfos.push(tokenInfo);
        pushBlocks(tokenInfo, index, data);
        prepareHover();
    };

    this.redraw = function() {
        self.timeline.redraw();
    };





    function addAddListener() {
        var onAdd = function(event) {
            /*
             * Gets info from the timeline generated element to create a new
             * TokenInfo entry; the addition here is actually cancelled and a
             * timed function is used to do the addition of the blocks
             * associated to the new token.
             */
            var row = getSelectedRow();
            var element = data[row];
            console.log("onAdd: row=" +row+ " element=" +JSON.stringify(element));

            var now = new Date().valueOf();
            if (element.start > now) {
                var addToken = function () {
                    var oneDay = 24*60*60*1000;
                    var early_start = element.start.valueOf();
                    var tokenInfo = {
                        'early_start' : new Date(early_start),
                        'late_start'  : new Date(early_start + oneDay),
                        'early_end'   : new Date(early_start + 3*oneDay),
                        'late_end'    : new Date(early_start + 4*oneDay),
                        'content'     : element.content,
                        'group'       : element.group,
                        'status'      : "status_new"
                    };
                    console.log("adding token " + JSON.stringify(tokenInfo));
                    var index = tokenInfos.length;
                    tokenInfos.push(tokenInfo);
                    pushBlocks(tokenInfo, index, data);
                    prepareHover();
                    self.redraw();
                };

                setTimeout(addToken, 100);
            }
            else pstatus("new goal in the past cannot be added");

            self.timeline.cancelAdd();
        };

        links.events.addListener(self.timeline, 'add', onAdd);
    }




    function addChangeListener() {

        function cancelChange(index, tokenInfo, msg) {
            pstatus(msg);

            self.timeline.cancelChange();

            var bgBlock    = data[4 * index + 0];
            var startBlock = data[4 * index + 1];
            var bodyBlock  = data[4 * index + 2];
            var endBlock   = data[4 * index + 3];

            startBlock.start = tokenInfo.early_start;
            startBlock.end   = tokenInfo.late_start ;
            bodyBlock.start  = tokenInfo.late_start ;
            bodyBlock.end    = tokenInfo.early_end  ;
            endBlock.start   = tokenInfo.early_end  ;
            endBlock.end     = tokenInfo.late_end   ;

            bgBlock.start = new Date(startBlock.start.valueOf());
            bgBlock.end   = new Date(endBlock.end.valueOf());
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

            var bgBlock    = data[4 * index + 0];
            var startBlock = data[4 * index + 1];
            var bodyBlock  = data[4 * index + 2];
            var endBlock   = data[4 * index + 3];

            console.log("bgBlock:    " + JSON.stringify(bgBlock));
            console.log("startBlock: " + JSON.stringify(startBlock));
            console.log("bodyBlock:  " + JSON.stringify(bodyBlock));
            console.log("endBlock:   " + JSON.stringify(endBlock));

            var newEarlyStart;
            var now = new Date();
            if (kind === "start") {
                if (startBlock.start < now) {
                    cancelChange(index, tokenInfo, "token cannot be in the past");
                    return;
                }
                if (startBlock.end > bodyBlock.end) {
                    cancelChange(index, tokenInfo, "????");
                    return;
                }
                originalDiff = tokenInfo.late_start - tokenInfo.early_start;
                newDiff = blockWidth(startBlock);
                diffDiff = Math.abs(originalDiff - newDiff);
                console.log("diffDiff = " + diffDiff);

                if (diffDiff == 0) {
                    // start block was just shifted.
                    // move the other blocks in the same shifted amount

                    delta = startBlock.end - tokenInfo.late_start;
                    console.log("delta: " + delta);

                    bodyBlock.start = new Date(bodyBlock.start.valueOf() + delta);
                    bodyBlock.end   = new Date(bodyBlock.end.valueOf() + delta);

                    endBlock.start = new Date(endBlock.start.valueOf() + delta);
                    endBlock.end   = new Date(endBlock.end.valueOf() + delta);
                }
                else {
                    // start block has changed its time span

                    if (startBlock.end > bodyBlock.end) {
                        self.timeline.cancelChange();
                        return;
                    }
                    bodyBlock.start = new Date(startBlock.end.valueOf());
                }
            }
            else if (kind === "body") {

                if (bodyBlock.start < now) {
                    cancelChange(index, tokenInfo, "token cannot be in the past");
                    return;
                }

                originalDiff = tokenInfo.early_end - tokenInfo.late_start;
                newDiff = blockWidth(bodyBlock);
                diffDiff = Math.abs(originalDiff - newDiff);
                console.log("diffDiff = " + diffDiff);

                if (diffDiff == 0) {
                    // body block was just shifted.
                    delta = bodyBlock.end - tokenInfo.early_end;

                    newEarlyStart = startBlock.start.valueOf() + delta;
                    if (newEarlyStart < now) {
                        cancelChange(index, tokenInfo, "token cannot be in the past");
                        return;
                    }

                    // move the other blocks in the same shifted amount
                    console.log("delta: " + delta);

                    startBlock.start = new Date(startBlock.start.valueOf() + delta);
                    startBlock.end   = new Date(startBlock.end.valueOf() + delta);

                    endBlock.start = new Date(endBlock.start.valueOf() + delta);
                    endBlock.end   = new Date(endBlock.end.valueOf() + delta);

                }
                else {
                    // body block has changed its time span.
                    var startwidth = blockWidth(startBlock);
                    newEarlyStart = bodyBlock.start.valueOf() - startwidth;

                    if (bodyBlock.start < startBlock.start) {
                        if (newEarlyStart < now) {
                            cancelChange(index, tokenInfo, "token cannot be in the past");
                            return;
                        }
                    }
                    if (bodyBlock.start < startBlock.end) {
                        startBlock.start = new Date(Math.max(newEarlyStart, now));
                    }
                    if (bodyBlock.end > endBlock.start) {
                        var endwidth   = Math.abs(endBlock.end - endBlock.start);
                        endBlock.end   = new Date(bodyBlock.end.valueOf() + endwidth);
                    }
                    startBlock.end = new Date(bodyBlock.start.valueOf());
                    endBlock.start = new Date(bodyBlock.end.valueOf());
                }
            }
            else if (kind === "end") {
                originalDiff = tokenInfo.late_end - tokenInfo.early_end;
                newDiff = endBlock.end - endBlock.start;
                diffDiff = Math.abs(originalDiff - newDiff);
                console.log("diffDiff = " + diffDiff);

                if (diffDiff == 0) {
                    // end block was just shifted.

                    newEarlyStart = endBlock.start
                                  - (blockWidth(startBlock) + blockWidth(bodyBlock));
                    if (newEarlyStart < now) {
                        cancelChange(index, tokenInfo, "token cannot be in the past");
                        return;
                    }

                    // move the other blocks in the same shifted amount

                    delta = endBlock.end - tokenInfo.late_end;
                    console.log("delta: " + delta);

                    startBlock.start = new Date(startBlock.start.valueOf() + delta);
                    startBlock.end   = new Date(startBlock.end.valueOf() + delta);

                    bodyBlock.start = new Date(bodyBlock.start.valueOf() + delta);
                    bodyBlock.end   = new Date(bodyBlock.end.valueOf() + delta);

                }
                else {
                    // end block has changed its time span

                    if (endBlock.start < bodyBlock.start) {
                        self.timeline.cancelChange();
                        return;
                    }
                    bodyBlock.end = new Date(endBlock.start.valueOf());
                }
            }

            // update tokenInfo:
            tokenInfo.early_start = startBlock.start;
            tokenInfo.late_start  = startBlock.end;
            tokenInfo.early_end   = bodyBlock.end;
            tokenInfo.late_end    = endBlock.end;

            bgBlock.start = new Date(startBlock.start.valueOf());
            bgBlock.end   = new Date(endBlock.end.valueOf());

            updateStatusModified(index, tokenInfo);

            prepareHover();
            self.redraw();

        };

        links.events.addListener(self.timeline, 'change', onChange);
    }

    this.updateStatus = function(index, tokenInfo, status) {
        tokenInfo.status = status;

        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        startBlock.className = "block-start" + " " + status;
        bodyBlock .className = "block-body"  + " " + status;
        endBlock  .className = "block-end"   + " " + status;

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

//            var kind  = element.tokenInfo.kind;
//            if (kind !== "body") {
//                self.timeline.cancelChange();
//                return;
//            }

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
//        addClass(index, "timeline-event-selected");
        // just update background block
        var bgBlock    = data[4 * index + 0];
        addClassBlock(bgBlock, "backgroud-block-selected");
        self.timeline.redraw();
    }

    function deselect(index) {
//        removeClass(index, "timeline-event-selected");
        // just update background block
        var bgBlock    = data[4 * index + 0];
        removeClassBlock(bgBlock, "backgroud-block-selected");
        self.timeline.redraw();
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
        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        addClassBlock(startBlock, clazz);
        addClassBlock(bodyBlock , clazz);
        addClassBlock(endBlock  , clazz);

        self.timeline.redraw();
    }

    function removeClass(index, clazz) {
        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        removeClassBlock(startBlock, clazz);
        removeClassBlock(bodyBlock , clazz);
        removeClassBlock(endBlock  , clazz);

        self.timeline.redraw();
    }




}
