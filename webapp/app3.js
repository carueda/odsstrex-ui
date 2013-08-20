$(document).ready(function() {

    refresh();

    $("#refresh").click(function() {
        refresh();
    });

    function refresh() {
        refresh_sched_info({
            from: "2013-05-03 00:00",
            to:   "2013-05-20 00:00"
        });
    }

    var timeline;
    var tokenInfos;
    var sections;
    var tokens;
    var data;

    var oldSelectedIndex = -1;


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
        $.ajax({
            url: "remove_pending",
            data: {},
            dataType: "text",
            success: function(res) {
                console.log("remove_pending response: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                console.log("error: " + thrownError);
            }
        });
    });

    $("#remove_draft").click(function() {
        $.ajax({
            url: "remove_draft",
            data: {},
            dataType: "text",
            success: function(res) {
                console.log("remove_draft reponse: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                console.log("error: " + thrownError);
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
        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            if (section.label === label) {
                return section.key;
            }
        }
        return -1;
    }

    function updateStatus(index, tokenInfo, status) {
        tokenInfo.status = status;

        var startBlock = data[4 * index + 1];
        var bodyBlock  = data[4 * index + 2];
        var endBlock   = data[4 * index + 3];

        startBlock.className = status;
        bodyBlock .className = status;
        endBlock  .className = status;

        timeline.redraw();
    }

    function updateStatusModified(index, tokenInfo) {
        if (tokenInfo.status === "status_new") {
            // keep it.
        }
        else if (tokenInfo.status === "status_new_saved") {
            updateStatus(index, tokenInfo, "status_new_modified");
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
        console.log("AFTER ADD'" +block.className+ "'");
    }

    function removeClassBlock(block, clazz) {
        var classes = block.className.split(/\s+/);
        var index = classes.indexOf(clazz);
        if (index >= 0) {
            delete classes[index];
        }
        block.className = classes.join(" ");
        console.log("AFTER REMOVE '" +block.className+ "'");
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
        $.post("/draft_goals", item, function(data) {
            console.log("/draft_goals: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
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
        $.post("/goal", item, function(data) {
            console.log("/goal: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
        });
    }

    function refresh_sched_info(req) {
        console.log("refresh_sched_info: " + JSON.stringify(req));
        $.ajax({
            dataType: "json",
            url: "tokens",
            data: req,

            success: function(res) {
                got_sched_info(req, res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                console.log("error: " + thrownError);
            }
        });
    }

    function got_sched_info(req, res) {

        if (timeline) {
            timeline.deleteAllItems();
            timeline = undefined;
        }

        sections = res.sections;
        tokens   = res.tokens;

        console.log("retrieved sections (" +sections.length+ ") = " + JSON.stringify(sections));
        console.log("retrieved tokens   (" +tokens.length+ ") = " + JSON.stringify(tokens));

        var sectionsDict = {};
        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            sectionsDict[section.key] = {'group': section.label, count: 0};
        }

        // initialize tokenInfos with reported info:
        tokenInfos = [];
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];

            sectionsDict[token.section_id].count += 1;

            tokenInfos.push({
                'early_start' : parseDate(token.early_start),
                'late_start'  : parseDate(token.late_start),
                'early_end'   : parseDate(token.early_end),
                'late_end'    : parseDate(token.late_end),
                'content'     : token.text,
                'group'       : sectionsDict[token.section_id].group,
                'status'      : token.status,
                'tid'         : token.tid
            });
        }

        function drawTimeline(data, container, showAxisLabels) {
            // specify options
            var options = {
                'width':            '99%',
                'height':           'auto',
                'editable':         true,
                'style':            'box',
                'snapEvents':       false,
                'eventMargin':      8,
                'eventMarginAxis':  8,
                //'showNavigation':   true,
                //'showButtonNew':    true,
                'showMajorLabels':  showAxisLabels,
                'showMinorLabels':  showAxisLabels,
                'axisOnTop':        true,
                'groupsChangeable': false
                //'groupsOnRight':    true,
//                'showCustomTime':    true
            };

            // Instantiate our timeline object.
            timeline = new links.Timeline(container);

            // Draw our timeline with the created data and options
            timeline.draw(data, options);

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

            var onEdit = function(event) {
                //console.log("onEdit: " + JSON.stringify(event));
                var row = getSelectedRow();
                var element = data[row];
                console.log("data[" + row + "] = " + JSON.stringify(element));

                var index = element.tokenInfo.index;
                var kind  = element.tokenInfo.kind;
                if (kind !== "body") {
                    timeline.cancelChange();
                    return;
                }

                var content = strip(data[row].content);
                var newContent = prompt("Enter content\n", content);
                if (newContent != undefined) {
                    data[row].content = newContent;
                    timeline.redraw();
                }
            };

            links.events.addListener(timeline, 'edit', onEdit);

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

                var now = new Date();
                if (element.start > now) {
                    var addToken = function () {
                        var oneDay = 24*60*60*1000;
                        var now = new Date();
                        var early_start = element.start.valueOf();
                        var tokenInfo = {
                            'early_start' : new Date(early_start),
                            'late_start'  : new Date(early_start + oneDay),
                            'early_end'   : new Date(early_start + 2*oneDay),
                            'late_end'    : new Date(early_start + 3*oneDay),
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
                else {
                    console.log("new token in the past cannot be added");
                }

                timeline.cancelAdd();
            };

            links.events.addListener(timeline, 'add', onAdd);

            var onSelect = function(event) {
                var row = getSelectedRow();
                if (oldSelectedIndex >= 0) {
                    removeClass(oldSelectedIndex, "timeline-event-selected");
                    oldSelectedIndex = -1;
                }
                if (row) {
                    console.log("onSelect (" +oldSelectedIndex+ "): " + JSON.stringify(data[row]));
                    var newIndex = data[row].tokenInfo.index;
                    addClass(newIndex, "timeline-event-selected");
                    oldSelectedIndex = newIndex;
                    timeline.selectItem(row);
                }
            };

            links.events.addListener(timeline, 'select', onSelect);

            var onChange = function(event) {
                var originalDiff, newDiff, diffDiff, delta;

                var row = getSelectedRow();
                var element = data[row];
                console.log("data[row] = " + JSON.stringify(element));

                var index = element.tokenInfo.index;
                var kind  = element.tokenInfo.kind;
                var tokenInfo = tokenInfos[index];

                console.log("tokenInfo: " + JSON.stringify(tokenInfo));

                var bgBlock    = data[4 * index + 0];
                var startBlock = data[4 * index + 1];
                var bodyBlock  = data[4 * index + 2];
                var endBlock   = data[4 * index + 3];

                console.log("bgBlock:    " + JSON.stringify(bgBlock));
                console.log("startBlock: " + JSON.stringify(startBlock));
                console.log("bodyBlock:  " + JSON.stringify(bodyBlock));
                console.log("endBlock:   " + JSON.stringify(endBlock));

                if (kind === "start") {
                    originalDiff = tokenInfo.late_start - tokenInfo.early_start;
                    newDiff = startBlock.end - startBlock.start;
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
                    originalDiff = tokenInfo.early_end - tokenInfo.late_start;
                    newDiff = bodyBlock.end - bodyBlock.start;
                    diffDiff = Math.abs(originalDiff - newDiff);
                    console.log("diffDiff = " + diffDiff);

                    if (diffDiff == 0) {
                        // body block was just shifted.
                        // move the other blocks in the same shifted amount

                        delta = bodyBlock.end - tokenInfo.early_end;
                        console.log("delta: " + delta);

                        startBlock.start = new Date(startBlock.start.valueOf() + delta);
                        startBlock.end   = new Date(startBlock.end.valueOf() + delta);

                        endBlock.start = new Date(endBlock.start.valueOf() + delta);
                        endBlock.end   = new Date(endBlock.end.valueOf() + delta);

                    }
                    else {
                        // body block has changed its time span

                        if (bodyBlock.start < startBlock.start) {
                            timeline.cancelChange();
                            return;
                        }
                        if (bodyBlock.end > endBlock.end) {
                            timeline.cancelChange();
                            return;
                        }
                        startBlock.end  = new Date(bodyBlock.start.valueOf());
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

            return timeline;
        }

        var timeline_id = "timelines";

        data = [];
        for (var index = 0; index < tokenInfos.length; index++) {
            var tokenInfo = tokenInfos[index];

            pushBlocks(tokenInfo, index, data);
        }

        // add dummy "blocks" for each empty section so the section shows up
        // in the interface.
        // (NOTE: Not using timeline.getGroup because, although the groups are
        // created, they disappear upon any change on any existing token.)
        for (var s = 0; s < sections.length; s++) {
            var sectionInfo = sectionsDict[sections[s].key];
            if (sectionInfo.count == 0) {
                var dummyTokenInfo = {
                    'group'       : sectionInfo.group
                };
                console.log("adding dummyTokenInfo " + JSON.stringify(dummyTokenInfo));
                var index = tokenInfos.length;
                tokenInfos.push(dummyTokenInfo);
                pushBlocks(dummyTokenInfo, index, data);
            }
        }

        var container = document.getElementById(timeline_id);
        timeline = drawTimeline(data, container, true);

        $(window).bind('resize', function() {
            timeline.redraw();
        });

        timeline.setVisibleChartRange(parseDate(req.from), parseDate(req.to), true);

        prepareHover();
    }

});
