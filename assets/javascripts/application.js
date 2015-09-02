var _ = {};

$(function () {
    'use strict';

    $(document).on('click', '.node', function () {
        open($(this).find('select'));
        return false;
    });
    $(document).on('click', '.node select', function (e) {
        e.stopPropagation();
    });

    var mousedown, selecting;
    $(document).on('mousedown', '.node', function () {
        mousedown = this;
    });

    $(document).on('mouseover', '.node', function () {
        if (!mousedown) return;
        var nodes = $(mousedown).closest('section.section').find('.node');
        var indexFrom = nodes.index(mousedown);
        var indexTo = nodes.index(this);
        if (indexTo == -1 || (!selecting && indexTo == indexFrom)) return;
        if (indexFrom > indexTo) {
            var t = indexTo;
            indexTo = indexFrom;
            indexFrom = t;
        }

        $('.selected').removeClass('selected');
        selecting = [];
        for (t = indexFrom; t <= indexTo; t++) {
            selecting.push(nodes.eq(t).addClass('selected'));
        }
    });

    $(document).on('mouseup', '.node', function () {
        if (!mousedown) return;
        // var nodes = $(mousedown).closest('section.section').find('.node');
        // var indexFrom = nodes.index(mousedown);
        // var indexTo = nodes.index(this);
        mousedown = false;
        // if (indexTo == -1 || indexTo == indexFrom) return;
        // if (indexFrom > indexTo) {
        //     var t = indexTo;
        //     indexTo = indexFrom;
        //     indexFrom = t;
        // }

        // selecting = [];
        // for (t = indexFrom; t <= indexTo; t++) {
        //     selecting.push(nodes.eq(t).addClass('selected'));
        // }

        if (!selecting) return;

        open($(this).find('select'));
    });

    $(document).on('change', '.node select', function () {
        $(this).closest('section').removeClass('done');
        if (!selecting) selecting = [$(this).closest('.node')];
        for (var i = 0; i < selecting.length; i++) {
            $(selecting[i]).find('select').val($(this).val());
            $(selecting[i]).css({'background-color': $(selecting[i]).find('option:selected').data('color')});
        }
        selecting = mousedown = null;
        $('.selected').removeClass('selected');
        _.save();
    });

    // #FIXME
    // $(document).on('click', 'section.section', function () {
    //     if (!mousedown) return;
    //     _.flashMessage(JSON.stringify([mousedown, selecting]));
    //     mousedown = selecting = null;
    //     $('.selected').removeClass('selected');
    // });
    $(document).on('dblclick', function () {
        selecting = mousedown = null;
        $('.selected').removeClass('selected');
    });

    $(document).on('click', '.tools i.done', function () {
        var section = $(this).closest('section');
        if (section.hasClass('done')) {
            section.removeClass('done');
        } else {
            section.addClass('done');
            var next = section.nextAll('section.section:not(.done)').eq(0);
            if (!next.length) {
                next = $('section.section:not(.done)').eq(0);
            }
            _.scrollTo(next);
        }
        _.save();
    });
    $(document).on('click', '.tools i.question', function () {
        $(this).closest('section').toggleClass('question');
        _.save();
    });

    _.openDialog = function () {
        $('#files option').remove();
        $('#files input').val('');
        $('#loading').fadeIn('slow');
        $('#files div div').eq(1).addClass('invisible');

        return $.post('/list', function (data) {
            data.data.forEach(function (e, i) {
                $('#select-name').append($('<option />').text(e).data('user', data.annotations[i]));
            });
            $('#files').fadeIn();
            $('#loading').fadeOut('slow');
        });
    };

    _.open = function (name, user) {
        $('#files').hide();
        $('#loading').fadeIn('slow');
        $('section.section').remove();
        $.post('/open', {'name': name, 'user': user}, function (result) {
            $(result).insertAfter('#loading');
            if ($('section.section.inconsistent').length) {
                $('section.section.inconsistent').each(function () {
                    var i = $('section.section').index(this);
                    var now = $(this).find('.node').length;
                    var stored = $(this).data('stored');
                    console.error('#' + (i + 1) + ' has now ' + now + ' nodes, but stored data has ' + stored.length + '.\n' +
                                  '(' + $.makeArray($(this).find('.surface').map(function () { return $(this).text(); })).join(' ') + ')\n' +
                                  'If you want to fix it efficiently, you can use this:\n\n' +
                                  '_.restoreSection(' + i + ', ' + JSON.stringify(stored) + ' /* <- fix this */);');
                });
                _.flashMessage('Inconsistent data (See console)');
            }
            $('#name').text(name);
            $('#user').text(user);
            _.ready();
            begin = new Date;
        }).fail(function () {
            _.flashMessage('ERROR');
            $('#files').fadeIn();
            $('#loading').fadeOut('slow');
        });
    };

    _.saving = false;
    _.save = function () {
        if (_.saving) {
            console.log('save cancelled');
            return null;
        }
        _.saving = true;
        console.log('save');
        return $.post('/save',
                      {
                          'user': $('#user').text(),
                          'name': $('#name').text(),
                          'annotation': JSON.stringify($.makeArray($('section.section').map(function () {
                              return {
                                  'labels': $.makeArray($(this).find('select').map(function () { return $(this).val(); })),
                                  'done': $(this).hasClass('done'),
                                  'question': $(this).hasClass('question')
                              };
                          })))
                      }, function () {
                          _.saving = false;
                      })
            .fail(function (e) { console.error(e); _.flashMessage('ERROR'); });
    };

    // _.restore = function (annotation) {
    //     if (typeof annotation !== 'object') {
    //         annotation = JSON.parse(annotation);
    //     }
    //     var errorFlag = false;
    //     for (var i = 0; i < annotation.length; i++) {
    //         $('section.section').eq(i)
    //             .toggleClass('done', annotation[i].done)
    //             .toggleClass('question', annotation[i].question);
    //         try {
    //             _.restoreSection(i, annotation[i].labels);
    //         } catch (e) {
    //             console.error(e.message);
    //             errorFlag = true;
    //         }
    //     }

    //     if (errorFlag) {
    //         _.flashMessage('Data incosistent (See console)');
    //     }
    // };

    _.restoreSection = function (i, labels) {
        for (var j = 0; j < labels.length; j++) {
            var select = $('section.section').eq(i).find('select').eq(j);
            select.val(labels[j]);
            select.closest('.node').css({'background-color': select.find('option:selected').data('color')});
        }

        var now = $('section.section').eq(i).find('select').length,
            stored = labels.length;
        if (now != stored) {
            return '#' + (i + 1) + ' has now ' + now + ' nodes, but stored data has ' + stored + '.\n' +
                '(' + $.makeArray($('section.section').eq(i).find('.surface').map(function () { return $(this).text(); })).join(' ') + ')\n' +
                'If you want to fix it efficiently, you can use this:\n\n' +
                '_.restoreSection(' + i + ', ' + JSON.stringify(labels) + ' /* <- fix this */);';
        }

        _.save();
        return 'OK';
    };

    _.ready = function () {
        var hash = location.hash.substr(1) | 0, scrollTo;
        if (hash > 0) {
            scrollTo = $('section.section').eq(hash - 1);
        } else {
            scrollTo = $('section.section:not(.done)').eq(0);
        }
        _.scrollTo(scrollTo);

        $('#loading').fadeOut('slow');
        _.flashMessage('Ready');
    };

    _.flashMessage = function (str) {
        var flash = $('<span />').addClass('flash').text(str);
        flash.prependTo($('nav#global')).delay(3000).fadeOut(1000);
        setTimeout(function () { flash.remove(); }, 4000);
        console.log(str, '[' + new Date() + ']');
    };

    _.scrollTo = function (e) {
        if (e.length) {
            $('html, body').animate({scrollTop: e.offset().top - 10}, 200);
        }
    };

    $('#select-name').on('change', function () {
        $('#select-user option').remove();
        $(this).find('option:selected').data('user').forEach(function (e) { $('#select-user').append($('<option />').text(e)); });
        if ($(this).find('option:selected').data('user').length) {
            $('#select-user').val($('#select-user option').eq(0).val()).trigger('focus');
        } else {
            $('#text-new').trigger('focus');
        }
        $('#select-user').parent().removeClass('invisible');
    });

    $('#button-open').on('click', function () {
        if ($('#select-user').val()) {
            _.open($('#select-name').val(), $('#select-user').val());
        }
    });

    $('#button-new').on('click', function () {
        var name = $('#text-new').val();
        if (name === '') {
            _.flashMessage('Input name');
        } else if (/[^-a-zA-Z0-9_.]/.test(name)) {
            _.flashMessage('Name should use only alphabets, digits, hyphens, underscores, and periods');
        } else {
            _.open($('#select-name').val(), name);
        }
    });

    $('#export').on('click', function () {
        if ($('section.section.done:not(.question)').length <= 0) {
            _.flashMessage('Exported file includes only checked items; thus nothing outputted.');
            return false;
        } else {
            location.href = '/export?user=' + $('#user').text() + '&name=' + $('#name').text();
            return true;
        }
    });

    $('#automation').on('click', function () {
        $('#loading').fadeIn('slow');
        _.save().done(function () {
            $.post('/automation', { 'user': $('#user').text(), 'name': $('#name').text() })
                .success(function (result) {
                    var modified = 0;
                    result.forEach(function (n) {
                        $('section.section').eq(n.index).find('select').each(function (i, e) {
                            if (n.annotation[i] !== null && n.annotation[i] != $(e).val()) {
                                modified++;
                                $(e).val(n.annotation[i]);
                                $(e).closest('section').addClass('strong');
                                $(e).closest('.node').css({'background-color': $(e).find('option:selected').data('color')});
                            }
                        });
                    });
                    $('#loading').fadeOut('slow');
                    _.flashMessage(modified + ' changes');
                    _.save();
                    if (modified > 0) {
                        _.scrollTo($('.strong').eq(0));
                        setInterval(function () { $('.strong').removeClass('strong'); }, 2000);
                    }
                })
                .fail(function (e) { console.error(e); $('#loading').fadeOut('slow'); _.flashMessage('ERROR'); });
        });
    });

    $('#uncheck').on('click', function () {
        if (confirm('Are you sure to uncheck all?')) {
            $('section.section').removeClass('done');
            _.save();
            _.flashMessage('Unchecked');
        } else {
            _.flashMessage('Canceled');
        }
    });

    $('#open').on('click', function () {
        if ($('#files').css('display') === 'none') {
            _.openDialog();
        } else {
            $('#files').hide();
        }
    });

    var begin = new Date;
    setInterval(function () {
        var now = new Date;
        var sec = Math.floor((now - begin) / 1000);
        var hour = Math.floor(sec / 3600);
        sec = sec % 3600;
        var min = Math.floor(sec / 60);
        sec = sec % 60;
        $('#clock').text(hour + ':' + (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec);

        $('#count-done').text($('section.section.done').length + ' (' + Math.floor(100 * $('section.section.done').length / $('section.section').length) + '%)');
        $('#count-question').text($('section.section.question').length);
        $('#count-total').text($('section.section').length);

        if (hour > 0 && min == 0 && sec == 0) {
            _.flashMessage('Take a rest');
        }
    }, 1000);

    /* Slightly modified from http://stackoverflow.com/a/13235219 */
    function open(elem) {
        if (document.createEvent) {
            var e = document.createEvent("MouseEvents");
            e.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            elem[0].dispatchEvent(e);
        } else if (elem[0].fireEvent) {
            elem[0].fireEvent("onmousedown");
        }
    }
});
