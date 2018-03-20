'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _CHARACTERS, _IS_ISSUE;

exports.isIssue = isIssue;
exports.formatIssue = formatIssue;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _location_helpers = require('./location_helpers');

var _step_result_helpers = require('./step_result_helpers');

var _indentString = require('indent-string');

var _indentString2 = _interopRequireDefault(_indentString);

var _status = require('../../status');

var _status2 = _interopRequireDefault(_status);

var _figures = require('figures');

var _figures2 = _interopRequireDefault(_figures);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

var _keyword_type = require('./keyword_type');

var _keyword_type2 = _interopRequireDefault(_keyword_type);

var _step_arguments = require('../../step_arguments');

var _gherkin_document_parser = require('./gherkin_document_parser');

var _pickle_parser = require('./pickle_parser');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CHARACTERS = (_CHARACTERS = {}, (0, _defineProperty3.default)(_CHARACTERS, _status2.default.AMBIGUOUS, _figures2.default.cross), (0, _defineProperty3.default)(_CHARACTERS, _status2.default.FAILED, _figures2.default.cross), (0, _defineProperty3.default)(_CHARACTERS, _status2.default.PASSED, _figures2.default.tick), (0, _defineProperty3.default)(_CHARACTERS, _status2.default.PENDING, '?'), (0, _defineProperty3.default)(_CHARACTERS, _status2.default.SKIPPED, '-'), (0, _defineProperty3.default)(_CHARACTERS, _status2.default.UNDEFINED, '?'), _CHARACTERS);

var IS_ISSUE = (_IS_ISSUE = {}, (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.AMBIGUOUS, true), (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.FAILED, true), (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.PASSED, false), (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.PENDING, true), (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.SKIPPED, false), (0, _defineProperty3.default)(_IS_ISSUE, _status2.default.UNDEFINED, true), _IS_ISSUE);

function formatDataTable(arg) {
  var rows = arg.rows.map(function (row) {
    return row.cells.map(function (cell) {
      return cell.value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    });
  });
  var table = new _cliTable2.default({
    chars: {
      bottom: '',
      'bottom-left': '',
      'bottom-mid': '',
      'bottom-right': '',
      left: '|',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      middle: '|',
      right: '|',
      'right-mid': '',
      top: '',
      'top-left': '',
      'top-mid': '',
      'top-right': ''
    },
    style: {
      border: [],
      'padding-left': 1,
      'padding-right': 1
    }
  });
  table.push.apply(table, (0, _toConsumableArray3.default)(rows));
  return table.toString();
}

function formatDocString(arg) {
  return '"""\n' + arg.content + '\n"""';
}

function formatStep(_ref) {
  var colorFns = _ref.colorFns,
      isBeforeHook = _ref.isBeforeHook,
      keyword = _ref.keyword,
      keywordType = _ref.keywordType,
      pickleStep = _ref.pickleStep,
      snippetBuilder = _ref.snippetBuilder,
      testStep = _ref.testStep;
  var status = testStep.result.status;

  var colorFn = colorFns[status];

  var identifier = void 0;
  if (testStep.sourceLocation) {
    identifier = keyword + (pickleStep.text || '');
  } else {
    identifier = isBeforeHook ? 'Before' : 'After';
  }

  var text = colorFn(CHARACTERS[status] + ' ' + identifier);

  var actionLocation = testStep.actionLocation;

  if (actionLocation) {
    text += ' # ' + colorFns.location((0, _location_helpers.formatLocation)(actionLocation));
  }
  text += '\n';

  if (pickleStep) {
    var str = void 0;
    var iterator = (0, _step_arguments.buildStepArgumentIterator)({
      dataTable: function dataTable(arg) {
        return str = formatDataTable(arg);
      },
      docString: function docString(arg) {
        return str = formatDocString(arg);
      }
    });
    _lodash2.default.each(pickleStep.arguments, iterator);
    if (str) {
      text += (0, _indentString2.default)(colorFn(str) + '\n', 4);
    }
  }
  var message = (0, _step_result_helpers.getStepMessage)({
    colorFns: colorFns,
    keywordType: keywordType,
    pickleStep: pickleStep,
    snippetBuilder: snippetBuilder,
    testStep: testStep
  });
  if (message) {
    text += (0, _indentString2.default)(message, 4) + '\n';
  }
  return text;
}

function isIssue(status) {
  return IS_ISSUE[status];
}

function formatIssue(_ref2) {
  var colorFns = _ref2.colorFns,
      gherkinDocument = _ref2.gherkinDocument,
      number = _ref2.number,
      pickle = _ref2.pickle,
      snippetBuilder = _ref2.snippetBuilder,
      testCase = _ref2.testCase;

  var prefix = number + ') ';
  var text = prefix;
  var scenarioLocation = (0, _location_helpers.formatLocation)(testCase.sourceLocation);
  text += 'Scenario: ' + pickle.name + ' # ' + colorFns.location(scenarioLocation) + '\n';
  var stepLineToKeywordMap = (0, _gherkin_document_parser.getStepLineToKeywordMap)(gherkinDocument);
  var stepLineToPickledStepMap = (0, _pickle_parser.getStepLineToPickledStepMap)(pickle);
  var isBeforeHook = true;
  var previousKeywordType = _keyword_type2.default.PRECONDITION;
  _lodash2.default.each(testCase.steps, function (testStep) {
    isBeforeHook = isBeforeHook && !testStep.sourceLocation;
    var keyword = void 0,
        keywordType = void 0,
        pickleStep = void 0;
    if (testStep.sourceLocation) {
      pickleStep = stepLineToPickledStepMap[testStep.sourceLocation.line];
      keyword = (0, _pickle_parser.getStepKeyword)({ pickleStep: pickleStep, stepLineToKeywordMap: stepLineToKeywordMap });
      keywordType = (0, _keyword_type.getStepKeywordType)({
        keyword: keyword,
        language: gherkinDocument.feature.language,
        previousKeywordType: previousKeywordType
      });
    }
    var formattedStep = formatStep({
      colorFns: colorFns,
      isBeforeHook: isBeforeHook,
      keyword: keyword,
      keywordType: keywordType,
      pickleStep: pickleStep,
      snippetBuilder: snippetBuilder,
      testStep: testStep
    });
    text += (0, _indentString2.default)(formattedStep, prefix.length);
    previousKeywordType = keywordType;
  });
  return text + '\n';
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9mb3JtYXR0ZXIvaGVscGVycy9pc3N1ZV9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbImlzSXNzdWUiLCJmb3JtYXRJc3N1ZSIsIkNIQVJBQ1RFUlMiLCJBTUJJR1VPVVMiLCJjcm9zcyIsIkZBSUxFRCIsIlBBU1NFRCIsInRpY2siLCJQRU5ESU5HIiwiU0tJUFBFRCIsIlVOREVGSU5FRCIsIklTX0lTU1VFIiwiZm9ybWF0RGF0YVRhYmxlIiwiYXJnIiwicm93cyIsIm1hcCIsInJvdyIsImNlbGxzIiwiY2VsbCIsInZhbHVlIiwicmVwbGFjZSIsInRhYmxlIiwiY2hhcnMiLCJib3R0b20iLCJsZWZ0IiwibWlkIiwibWlkZGxlIiwicmlnaHQiLCJ0b3AiLCJzdHlsZSIsImJvcmRlciIsInB1c2giLCJ0b1N0cmluZyIsImZvcm1hdERvY1N0cmluZyIsImNvbnRlbnQiLCJmb3JtYXRTdGVwIiwiY29sb3JGbnMiLCJpc0JlZm9yZUhvb2siLCJrZXl3b3JkIiwia2V5d29yZFR5cGUiLCJwaWNrbGVTdGVwIiwic25pcHBldEJ1aWxkZXIiLCJ0ZXN0U3RlcCIsInN0YXR1cyIsInJlc3VsdCIsImNvbG9yRm4iLCJpZGVudGlmaWVyIiwic291cmNlTG9jYXRpb24iLCJ0ZXh0IiwiYWN0aW9uTG9jYXRpb24iLCJsb2NhdGlvbiIsInN0ciIsIml0ZXJhdG9yIiwiZGF0YVRhYmxlIiwiZG9jU3RyaW5nIiwiZWFjaCIsImFyZ3VtZW50cyIsIm1lc3NhZ2UiLCJnaGVya2luRG9jdW1lbnQiLCJudW1iZXIiLCJwaWNrbGUiLCJ0ZXN0Q2FzZSIsInByZWZpeCIsInNjZW5hcmlvTG9jYXRpb24iLCJuYW1lIiwic3RlcExpbmVUb0tleXdvcmRNYXAiLCJzdGVwTGluZVRvUGlja2xlZFN0ZXBNYXAiLCJwcmV2aW91c0tleXdvcmRUeXBlIiwiUFJFQ09ORElUSU9OIiwic3RlcHMiLCJsaW5lIiwibGFuZ3VhZ2UiLCJmZWF0dXJlIiwiZm9ybWF0dGVkU3RlcCIsImxl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d0JBLFNBQVVTLElBQVY7QUFDRCIsImZpbGUiOiJpc3N1ZV9oZWxwZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJ1xuaW1wb3J0IHsgZm9ybWF0TG9jYXRpb24gfSBmcm9tICcuL2xvY2F0aW9uX2hlbHBlcnMnXG5pbXBvcnQgeyBnZXRTdGVwTWVzc2FnZSB9IGZyb20gJy4vc3RlcF9yZXN1bHRfaGVscGVycydcbmltcG9ydCBpbmRlbnRTdHJpbmcgZnJvbSAnaW5kZW50LXN0cmluZydcbmltcG9ydCBTdGF0dXMgZnJvbSAnLi4vLi4vc3RhdHVzJ1xuaW1wb3J0IGZpZ3VyZXMgZnJvbSAnZmlndXJlcydcbmltcG9ydCBUYWJsZSBmcm9tICdjbGktdGFibGUnXG5pbXBvcnQgS2V5d29yZFR5cGUsIHsgZ2V0U3RlcEtleXdvcmRUeXBlIH0gZnJvbSAnLi9rZXl3b3JkX3R5cGUnXG5pbXBvcnQgeyBidWlsZFN0ZXBBcmd1bWVudEl0ZXJhdG9yIH0gZnJvbSAnLi4vLi4vc3RlcF9hcmd1bWVudHMnXG5pbXBvcnQgeyBnZXRTdGVwTGluZVRvS2V5d29yZE1hcCB9IGZyb20gJy4vZ2hlcmtpbl9kb2N1bWVudF9wYXJzZXInXG5pbXBvcnQgeyBnZXRTdGVwTGluZVRvUGlja2xlZFN0ZXBNYXAsIGdldFN0ZXBLZXl3b3JkIH0gZnJvbSAnLi9waWNrbGVfcGFyc2VyJ1xuXG5jb25zdCBDSEFSQUNURVJTID0ge1xuICBbU3RhdHVzLkFNQklHVU9VU106IGZpZ3VyZXMuY3Jvc3MsXG4gIFtTdGF0dXMuRkFJTEVEXTogZmlndXJlcy5jcm9zcyxcbiAgW1N0YXR1cy5QQVNTRURdOiBmaWd1cmVzLnRpY2ssXG4gIFtTdGF0dXMuUEVORElOR106ICc/JyxcbiAgW1N0YXR1cy5TS0lQUEVEXTogJy0nLFxuICBbU3RhdHVzLlVOREVGSU5FRF06ICc/Jyxcbn1cblxuY29uc3QgSVNfSVNTVUUgPSB7XG4gIFtTdGF0dXMuQU1CSUdVT1VTXTogdHJ1ZSxcbiAgW1N0YXR1cy5GQUlMRURdOiB0cnVlLFxuICBbU3RhdHVzLlBBU1NFRF06IGZhbHNlLFxuICBbU3RhdHVzLlBFTkRJTkddOiB0cnVlLFxuICBbU3RhdHVzLlNLSVBQRURdOiBmYWxzZSxcbiAgW1N0YXR1cy5VTkRFRklORURdOiB0cnVlLFxufVxuXG5mdW5jdGlvbiBmb3JtYXREYXRhVGFibGUoYXJnKSB7XG4gIGNvbnN0IHJvd3MgPSBhcmcucm93cy5tYXAocm93ID0+XG4gICAgcm93LmNlbGxzLm1hcChjZWxsID0+XG4gICAgICBjZWxsLnZhbHVlLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgKVxuICApXG4gIGNvbnN0IHRhYmxlID0gbmV3IFRhYmxlKHtcbiAgICBjaGFyczoge1xuICAgICAgYm90dG9tOiAnJyxcbiAgICAgICdib3R0b20tbGVmdCc6ICcnLFxuICAgICAgJ2JvdHRvbS1taWQnOiAnJyxcbiAgICAgICdib3R0b20tcmlnaHQnOiAnJyxcbiAgICAgIGxlZnQ6ICd8JyxcbiAgICAgICdsZWZ0LW1pZCc6ICcnLFxuICAgICAgbWlkOiAnJyxcbiAgICAgICdtaWQtbWlkJzogJycsXG4gICAgICBtaWRkbGU6ICd8JyxcbiAgICAgIHJpZ2h0OiAnfCcsXG4gICAgICAncmlnaHQtbWlkJzogJycsXG4gICAgICB0b3A6ICcnLFxuICAgICAgJ3RvcC1sZWZ0JzogJycsXG4gICAgICAndG9wLW1pZCc6ICcnLFxuICAgICAgJ3RvcC1yaWdodCc6ICcnLFxuICAgIH0sXG4gICAgc3R5bGU6IHtcbiAgICAgIGJvcmRlcjogW10sXG4gICAgICAncGFkZGluZy1sZWZ0JzogMSxcbiAgICAgICdwYWRkaW5nLXJpZ2h0JzogMSxcbiAgICB9LFxuICB9KVxuICB0YWJsZS5wdXNoKC4uLnJvd3MpXG4gIHJldHVybiB0YWJsZS50b1N0cmluZygpXG59XG5cbmZ1bmN0aW9uIGZvcm1hdERvY1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIGBcIlwiXCJcXG4ke2FyZy5jb250ZW50fVxcblwiXCJcImBcbn1cblxuZnVuY3Rpb24gZm9ybWF0U3RlcCh7XG4gIGNvbG9yRm5zLFxuICBpc0JlZm9yZUhvb2ssXG4gIGtleXdvcmQsXG4gIGtleXdvcmRUeXBlLFxuICBwaWNrbGVTdGVwLFxuICBzbmlwcGV0QnVpbGRlcixcbiAgdGVzdFN0ZXAsXG59KSB7XG4gIGNvbnN0IHsgc3RhdHVzIH0gPSB0ZXN0U3RlcC5yZXN1bHRcbiAgY29uc3QgY29sb3JGbiA9IGNvbG9yRm5zW3N0YXR1c11cblxuICBsZXQgaWRlbnRpZmllclxuICBpZiAodGVzdFN0ZXAuc291cmNlTG9jYXRpb24pIHtcbiAgICBpZGVudGlmaWVyID0ga2V5d29yZCArIChwaWNrbGVTdGVwLnRleHQgfHwgJycpXG4gIH0gZWxzZSB7XG4gICAgaWRlbnRpZmllciA9IGlzQmVmb3JlSG9vayA/ICdCZWZvcmUnIDogJ0FmdGVyJ1xuICB9XG5cbiAgbGV0IHRleHQgPSBjb2xvckZuKGAke0NIQVJBQ1RFUlNbc3RhdHVzXX0gJHtpZGVudGlmaWVyfWApXG5cbiAgY29uc3QgeyBhY3Rpb25Mb2NhdGlvbiB9ID0gdGVzdFN0ZXBcbiAgaWYgKGFjdGlvbkxvY2F0aW9uKSB7XG4gICAgdGV4dCArPSBgICMgJHtjb2xvckZucy5sb2NhdGlvbihmb3JtYXRMb2NhdGlvbihhY3Rpb25Mb2NhdGlvbikpfWBcbiAgfVxuICB0ZXh0ICs9ICdcXG4nXG5cbiAgaWYgKHBpY2tsZVN0ZXApIHtcbiAgICBsZXQgc3RyXG4gICAgY29uc3QgaXRlcmF0b3IgPSBidWlsZFN0ZXBBcmd1bWVudEl0ZXJhdG9yKHtcbiAgICAgIGRhdGFUYWJsZTogYXJnID0+IChzdHIgPSBmb3JtYXREYXRhVGFibGUoYXJnKSksXG4gICAgICBkb2NTdHJpbmc6IGFyZyA9PiAoc3RyID0gZm9ybWF0RG9jU3RyaW5nKGFyZykpLFxuICAgIH0pXG4gICAgXy5lYWNoKHBpY2tsZVN0ZXAuYXJndW1lbnRzLCBpdGVyYXRvcilcbiAgICBpZiAoc3RyKSB7XG4gICAgICB0ZXh0ICs9IGluZGVudFN0cmluZyhgJHtjb2xvckZuKHN0cil9XFxuYCwgNClcbiAgICB9XG4gIH1cbiAgY29uc3QgbWVzc2FnZSA9IGdldFN0ZXBNZXNzYWdlKHtcbiAgICBjb2xvckZucyxcbiAgICBrZXl3b3JkVHlwZSxcbiAgICBwaWNrbGVTdGVwLFxuICAgIHNuaXBwZXRCdWlsZGVyLFxuICAgIHRlc3RTdGVwLFxuICB9KVxuICBpZiAobWVzc2FnZSkge1xuICAgIHRleHQgKz0gYCR7aW5kZW50U3RyaW5nKG1lc3NhZ2UsIDQpfVxcbmBcbiAgfVxuICByZXR1cm4gdGV4dFxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJc3N1ZShzdGF0dXMpIHtcbiAgcmV0dXJuIElTX0lTU1VFW3N0YXR1c11cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdElzc3VlKHtcbiAgY29sb3JGbnMsXG4gIGdoZXJraW5Eb2N1bWVudCxcbiAgbnVtYmVyLFxuICBwaWNrbGUsXG4gIHNuaXBwZXRCdWlsZGVyLFxuICB0ZXN0Q2FzZSxcbn0pIHtcbiAgY29uc3QgcHJlZml4ID0gYCR7bnVtYmVyfSkgYFxuICBsZXQgdGV4dCA9IHByZWZpeFxuICBjb25zdCBzY2VuYXJpb0xvY2F0aW9uID0gZm9ybWF0TG9jYXRpb24odGVzdENhc2Uuc291cmNlTG9jYXRpb24pXG4gIHRleHQgKz0gYFNjZW5hcmlvOiAke3BpY2tsZS5uYW1lfSAjICR7Y29sb3JGbnMubG9jYXRpb24oc2NlbmFyaW9Mb2NhdGlvbil9XFxuYFxuICBjb25zdCBzdGVwTGluZVRvS2V5d29yZE1hcCA9IGdldFN0ZXBMaW5lVG9LZXl3b3JkTWFwKGdoZXJraW5Eb2N1bWVudClcbiAgY29uc3Qgc3RlcExpbmVUb1BpY2tsZWRTdGVwTWFwID0gZ2V0U3RlcExpbmVUb1BpY2tsZWRTdGVwTWFwKHBpY2tsZSlcbiAgbGV0IGlzQmVmb3JlSG9vayA9IHRydWVcbiAgbGV0IHByZXZpb3VzS2V5d29yZFR5cGUgPSBLZXl3b3JkVHlwZS5QUkVDT05ESVRJT05cbiAgXy5lYWNoKHRlc3RDYXNlLnN0ZXBzLCB0ZXN0U3RlcCA9PiB7XG4gICAgaXNCZWZvcmVIb29rID0gaXNCZWZvcmVIb29rICYmICF0ZXN0U3RlcC5zb3VyY2VMb2NhdGlvblxuICAgIGxldCBrZXl3b3JkLCBrZXl3b3JkVHlwZSwgcGlja2xlU3RlcFxuICAgIGlmICh0ZXN0U3RlcC5zb3VyY2VMb2NhdGlvbikge1xuICAgICAgcGlja2xlU3RlcCA9IHN0ZXBMaW5lVG9QaWNrbGVkU3RlcE1hcFt0ZXN0U3RlcC5zb3VyY2VMb2NhdGlvbi5saW5lXVxuICAgICAga2V5d29yZCA9IGdldFN0ZXBLZXl3b3JkKHsgcGlja2xlU3RlcCwgc3RlcExpbmVUb0tleXdvcmRNYXAgfSlcbiAgICAgIGtleXdvcmRUeXBlID0gZ2V0U3RlcEtleXdvcmRUeXBlKHtcbiAgICAgICAga2V5d29yZCxcbiAgICAgICAgbGFuZ3VhZ2U6IGdoZXJraW5Eb2N1bWVudC5mZWF0dXJlLmxhbmd1YWdlLFxuICAgICAgICBwcmV2aW91c0tleXdvcmRUeXBlLFxuICAgICAgfSlcbiAgICB9XG4gICAgY29uc3QgZm9ybWF0dGVkU3RlcCA9IGZvcm1hdFN0ZXAoe1xuICAgICAgY29sb3JGbnMsXG4gICAgICBpc0JlZm9yZUhvb2ssXG4gICAgICBrZXl3b3JkLFxuICAgICAga2V5d29yZFR5cGUsXG4gICAgICBwaWNrbGVTdGVwLFxuICAgICAgc25pcHBldEJ1aWxkZXIsXG4gICAgICB0ZXN0U3RlcCxcbiAgICB9KVxuICAgIHRleHQgKz0gaW5kZW50U3RyaW5nKGZvcm1hdHRlZFN0ZXAsIHByZWZpeC5sZW5ndGgpXG4gICAgcHJldmlvdXNLZXl3b3JkVHlwZSA9IGtleXdvcmRUeXBlXG4gIH0pXG4gIHJldHVybiBgJHt0ZXh0fVxcbmBcbn1cbiJdfQ==