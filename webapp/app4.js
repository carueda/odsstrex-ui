$(document).ready(function() {

    var tt = {};
    tt.startDate = undefined;
    tt.endDate = undefined;

    var timeline;
    var tokenInfos;
    var data;

    var oldSelectedIndex = -1;


    editFormPrepare();

    createTimelineWidget();
    addAddListener();
    addChangeListener();
    addSelectListener();
    addEditListener();
    addResizeListener();


    refresh();

    $("#refresh").click(function() {
        refresh();
    });

    function createTimelineWidget() {
        var container = document.getElementById("timelines");
        timeline = new links.Timeline(container);
    }

    function refresh() {
        refresh_timelines({ /*pending req*/ });
    }

    function refresh_timelines(req) {
        console.log("refresh_timelines");
        pprogress("refreshing timelines ...");
        $.ajax({
            dataType: "json",
            url: "timelines",
            data: req,

            success: function(res) {
                success();
                got_timelines(req, res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }


    function got_timelines(req, res) {

        initTimelines(req, res);
        putGroups();
        putTokens();
        drawTimelineWidget();

        setVisibleChartRange();

    }

    function initTimelines(req, res) {
        tt.timelines = res;
        console.log("initTimelines = " + JSON.stringify(tt.timelines));

        data = [];
        tokenInfos = [];
    }

    function putGroups() {
        for (var s = 0; s < tt.timelines.length; s++) {
            var tml = tt.timelines[s];
            var name = tml.name;

//            if (!tml.accept_goals) {
//                name = "<div style='color: red'>" + name + "</div>";
//            }

            var dummyTokenInfo = {
                'group'       : name
            };
            //console.log("adding dummyTokenInfo " + JSON.stringify(dummyTokenInfo));
            var index = tokenInfos.length;
            tokenInfos.push(dummyTokenInfo);
            pushBlocks(dummyTokenInfo, index, data);
        }
    }

    function putTokens() {
        for (var s = 0; s < tt.timelines.length; s++) {
            getTokens(tt.timelines[s].name);
        }
    }

    function getTokens(timelineName) {
//        console.log("getting tokens for " + timelineName);
        pprogress("getting tokens for " + timelineName);
        $.ajax({
            dataType: "json",
            url: "timeline/" + timelineName,
            data: {},

            success: function(res) {
                success();
                gotTokens(timelineName, res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }

    function gotTokens(timelineName, tokens) {
        if (tokens.length == 0) {
            return;
        }
        console.log("got tokens for " + timelineName + " = " + JSON.stringify(tokens));

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];

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
        }

        timeline.redraw();
    }

    function drawTimelineWidget() {

        timeline.deleteAllItems();

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

        timeline.draw(data, options);
    }

    function getSelectedRow() {
        var row = undefined;
        var sel = timeline.getSelection();
        if (sel.length) {
            if (sel[0].row != undefined) {
                row = sel[0].row;
            }
        }
        return row;
    }


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
                    timeline.redraw();
                };

                setTimeout(addToken, 100);
            }
            else pstatus("new goal in the past cannot be added");

            timeline.cancelAdd();
        };

        links.events.addListener(timeline, 'add', onAdd);
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
                timeline.selectItem(row);
            }
        };

        links.events.addListener(timeline, 'select', onSelect);
    }

    function addChangeListener() {

        function cancelChange(index, tokenInfo, msg) {
            pstatus(msg);

            timeline.cancelChange();

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
                        timeline.cancelChange();
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
                        timeline.cancelChange();
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
            timeline.redraw();

        };

        links.events.addListener(timeline, 'change', onChange);
    }

    function addEditListener() {
        var onEdit = function(event) {
            //console.log("onEdit: " + JSON.stringify(event));
            var row = getSelectedRow();
            var element = data[row];
            console.log("data[" + row + "] = " + JSON.stringify(element));

//            var kind  = element.tokenInfo.kind;
//            if (kind !== "body") {
//                timeline.cancelChange();
//                return;
//            }

            var index = element.tokenInfo.index;
            var tokenInfo = tokenInfos[index];

//            var content = strip(data[row].content);
//            var newContent = prompt("Enter content\n", content);
//            if (newContent != undefined) {
//                data[row].content = newContent;
//                tokenInfo.content = newContent;
//                timeline.redraw();
//            }

            editFormShow(index, tokenInfo);
        };

        links.events.addListener(timeline, 'edit', onEdit);
    }

    function addResizeListener() {
        $(window).bind('resize', function() {
            timeline.redraw();
        });
    }


    /**
     * TODO make it more intelligent
     */
    function setVisibleChartRange() {
        if (tt.startDate == undefined) {
            var now = new Date().valueOf();
            tt.startDate = new Date(now -  4*24*60*60*1000);
            tt.endDate   = new Date(now + 20*24*60*60*1000);
            timeline.setVisibleChartRange(tt.startDate, tt.endDate, true);
        }
    }

    /////////////////////////////////////////////////////////////////////////


    $(document).ajaxError(function(event, request, settings) {
        perror("Error requesting page " + settings.url);
    });

    $("#save_draft_goals").click(function() {
        for (var index = 0; index < tokenInfos.length; index++) {
            var tokenInfo = tokenInfos[index];
            if (isNew(tokenInfo)) {
                console.log("tokenInfo.status = " + JSON.stringify(tokenInfo.status));
                saveDraftGoal(tokenInfo, index);
            }
        }
    });

    $("#submitGoals").click(function() {
        for (var index = 0; index < tokenInfos.length; index++) {
            var tokenInfo = tokenInfos[index];
            if (isNew(tokenInfo) || isPendingModified(tokenInfo)) {
                console.log("tokenInfo.status = " + JSON.stringify(tokenInfo.status));
                submitGoal(tokenInfo, index);
            }
        }
    });

    $("#remove_pending").click(function() {
        pprogress("removing pending...");
        $.ajax({
            url: "remove_pending",
            data: {},
            dataType: "text",
            success: function(res) {
                success();
                console.log("remove_pending response: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#remove_draft").click(function() {
        pprogress("removing drafts..");
        $.ajax({
            url: "remove_draft",
            data: {},
            dataType: "text",
            success: function(res) {
                success();
                console.log("remove_draft reponse: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#removeAll").click(function() {
        pprogress("removing all...");
        $.ajax({
            url: "remove_all",
            data: {},
            dataType: "text",
            success: function(res) {
                success();
                console.log("remove_all reponse: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#redraw").click(function() {
        timeline.redraw();
    });

    function isNew(tokenInfo) {
        var isNew = tokenInfo.status !== undefined &&
                    tokenInfo.status.toString().indexOf("status_new") >= 0;
        return isNew;
    }

    function isPendingModified(tokenInfo) {
        return tokenInfo.status === "status_pending_modified";
    }

    function sectionLabelToKey(label) {
        return label;
//        for (var s = 0; s < sections.length; s++) {
//            var section = sections[s];
//            if (section.label === label) {
//                return section.key;
//            }
//        }
//        return -1;
    }

    function updateStatus(index, tokenInfo, status) {
        tokenInfo.status = status;

        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        startBlock.className = "block-start" + " " + status;
        bodyBlock .className = "block-body"  + " " + status;
        endBlock  .className = "block-end"   + " " + status;

        timeline.redraw();
    }

    function updateStatusModified(index, tokenInfo) {
        if (tokenInfo.status === "status_new") {
            return;
        }
        else if (tokenInfo.status === "status_new_saved") {
            updateStatus(index, tokenInfo, "status_new_modified");
        }
        else if (tokenInfo.status.match(/.*_modified/)) {
            return;
        }
        else {
            updateStatus(index, tokenInfo, tokenInfo.status + "_modified");
        }
        console.log("modifed status set to: " + tokenInfo.status);
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

        timeline.redraw();
    }

    function removeClass(index, clazz) {
        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        removeClassBlock(startBlock, clazz);
        removeClassBlock(bodyBlock , clazz);
        removeClassBlock(endBlock  , clazz);

        timeline.redraw();
    }

    function select(index) {
//        addClass(index, "timeline-event-selected");
        // just update background block
        var bgBlock    = data[4 * index + 0];
        addClassBlock(bgBlock, "backgroud-block-selected");
        timeline.redraw();
    }

    function deselect(index) {
//        removeClass(index, "timeline-event-selected");
        // just update background block
        var bgBlock    = data[4 * index + 0];
        removeClassBlock(bgBlock, "backgroud-block-selected");
        timeline.redraw();
    }

    function saveDraftGoal(tokenInfo, index) {
        var item = {
            early_start: unparseDate(tokenInfo.early_start),
            late_start:  unparseDate(tokenInfo.late_start),
            early_end:   unparseDate(tokenInfo.early_end),
            late_end:    unparseDate(tokenInfo.late_end),
            text:        tokenInfo.content,
            section:     sectionLabelToKey(tokenInfo.group),
            tid:         tokenInfo.tid
        };
        console.log("/draft_goals: posting " + JSON.stringify(item));
        pprogress("saving drafts...");
        $.post("draft_goals", item, function(data) {
            success();
            console.log("/draft_goals: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
        }).always(function() {
            pprogress();
        });
    }


    function submitGoal(tokenInfo, index) {
        var item = {
            early_start: unparseDate(tokenInfo.early_start),
            late_start:  unparseDate(tokenInfo.late_start),
            early_end:   unparseDate(tokenInfo.early_end),
            late_end:    unparseDate(tokenInfo.late_end),
            text:        tokenInfo.content,
            section:     sectionLabelToKey(tokenInfo.group),
            tid:         tokenInfo.tid
        };
        console.log("posting " + JSON.stringify(item));
        pprogress("submitting goal..");
        $.post("goal", item, function(data) {
            success();
            console.log("/goal: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
        }).always(function() {
            pprogress();
        });
    }

});
