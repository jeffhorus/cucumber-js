'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _helpers = require('../../formatter/helpers');

var _command_types = require('./command_types');

var _command_types2 = _interopRequireDefault(_command_types);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _readline = require('readline');

var _readline2 = _interopRequireDefault(_readline);

var _stack_trace_filter = require('../stack_trace_filter');

var _stack_trace_filter2 = _interopRequireDefault(_stack_trace_filter);

var _support_code_library_builder = require('../../support_code_library_builder');

var _support_code_library_builder2 = _interopRequireDefault(_support_code_library_builder);

var _test_case_runner = require('../test_case_runner');

var _test_case_runner2 = _interopRequireDefault(_test_case_runner);

var _user_code_runner = require('../../user_code_runner');

var _user_code_runner2 = _interopRequireDefault(_user_code_runner);

var _verror = require('verror');

var _verror2 = _interopRequireDefault(_verror);

var _escapeStringRegexp = require('escape-string-regexp');

var _escapeStringRegexp2 = _interopRequireDefault(_escapeStringRegexp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EVENTS = ['test-case-prepared', 'test-case-started', 'test-step-started', 'test-step-attachment', 'test-step-finished', 'test-case-finished'];

var Slave = function () {
  function Slave(_ref) {
    var _this = this;

    var cwd = _ref.cwd,
        stdin = _ref.stdin,
        stdout = _ref.stdout;
    (0, _classCallCheck3.default)(this, Slave);

    this.initialized = false;
    this.stdin = stdin;
    this.stdout = stdout;
    this.cwd = cwd;
    this.eventBroadcaster = new _events2.default();
    this.stackTraceFilter = new _stack_trace_filter2.default();

    var pathSepRegexp = new RegExp((0, _escapeStringRegexp2.default)(_path2.default.sep), 'g');
    var pathToRemove = cwd.replace(pathSepRegexp, _path2.default.posix.sep) + _path2.default.posix.sep;
    this.pathRegexp = new RegExp((0, _escapeStringRegexp2.default)(pathToRemove), 'g');

    EVENTS.forEach(function (name) {
      _this.eventBroadcaster.on(name, function (data) {
        // Format error instance
        if (data.result && data.result.exception instanceof Error) {
          data.result.exception = data.result.exception.stack.replace(_this.pathRegexp, '');
        }

        return _this.stdout.write(JSON.stringify({ command: _command_types2.default.EVENT, name: name, data: data }) + '\n');
      });
    });
  }

  (0, _createClass3.default)(Slave, [{
    key: 'initialize',
    value: function () {
      var _ref3 = (0, _bluebird.coroutine)(function* (_ref2) {
        var filterStacktraces = _ref2.filterStacktraces,
            supportCodeRequiredModules = _ref2.supportCodeRequiredModules,
            supportCodePaths = _ref2.supportCodePaths,
            worldParameters = _ref2.worldParameters;

        supportCodeRequiredModules.map(function (module) {
          return require(module);
        });
        _support_code_library_builder2.default.reset(this.cwd);
        supportCodePaths.forEach(function (codePath) {
          return require(codePath);
        });
        this.supportCodeLibrary = _support_code_library_builder2.default.finalize();
        this.worldParameters = worldParameters;
        this.filterStacktraces = filterStacktraces;
        if (this.filterStacktraces) {
          this.stackTraceFilter.filter();
        }
        yield this.runTestRunHooks('beforeTestRunHookDefinitions', 'a BeforeAll');
        this.stdout.write(JSON.stringify({ command: _command_types2.default.READY }) + '\n');
      });

      function initialize(_x) {
        return _ref3.apply(this, arguments);
      }

      return initialize;
    }()
  }, {
    key: 'finalize',
    value: function () {
      var _ref4 = (0, _bluebird.coroutine)(function* () {
        yield this.runTestRunHooks('afterTestRunHookDefinitions', 'an AfterAll');
        if (this.filterStacktraces) {
          this.stackTraceFilter.unfilter();
        }
        process.exit();
      });

      function finalize() {
        return _ref4.apply(this, arguments);
      }

      return finalize;
    }()
  }, {
    key: 'parseMasterLine',
    value: function parseMasterLine(line) {
      var input = JSON.parse(line);
      if (input.command === 'initialize') {
        this.initialize(input);
      } else if (input.command === 'finalize') {
        this.finalize();
      } else if (input.command === 'run') {
        this.runTestCase(input);
      }
    }
  }, {
    key: 'run',
    value: function () {
      var _ref5 = (0, _bluebird.coroutine)(function* () {
        var _this2 = this;

        this.rl = _readline2.default.createInterface({ input: this.stdin });
        this.rl.on('line', function (line) {
          _this2.parseMasterLine(line);
        });
      });

      function run() {
        return _ref5.apply(this, arguments);
      }

      return run;
    }()
  }, {
    key: 'runTestCase',
    value: function () {
      var _ref7 = (0, _bluebird.coroutine)(function* (_ref6) {
        var testCase = _ref6.testCase,
            skip = _ref6.skip;

        var testCaseRunner = new _test_case_runner2.default({
          eventBroadcaster: this.eventBroadcaster,
          skip: skip,
          supportCodeLibrary: this.supportCodeLibrary,
          testCase: testCase,
          worldParameters: this.worldParameters
        });
        yield testCaseRunner.run();
        this.stdout.write(JSON.stringify({ command: _command_types2.default.READY }) + '\n');
      });

      function runTestCase(_x2) {
        return _ref7.apply(this, arguments);
      }

      return runTestCase;
    }()
  }, {
    key: 'runTestRunHooks',
    value: function () {
      var _ref8 = (0, _bluebird.coroutine)(function* (key, name) {
        var _this3 = this;

        yield _bluebird2.default.each(this.supportCodeLibrary[key], function () {
          var _ref9 = (0, _bluebird.coroutine)(function* (hookDefinition) {
            var _ref10 = yield _user_code_runner2.default.run({
              argsArray: [],
              fn: hookDefinition.code,
              thisArg: null,
              timeoutInMilliseconds: hookDefinition.options.timeout || _this3.supportCodeLibrary.defaultTimeout
            }),
                error = _ref10.error;

            if (error) {
              var location = (0, _helpers.formatLocation)(hookDefinition);
              throw new _verror2.default(error, name + ' hook errored, process exiting: ' + location);
            }
          });

          return function (_x5) {
            return _ref9.apply(this, arguments);
          };
        }());
      });

      function runTestRunHooks(_x3, _x4) {
        return _ref8.apply(this, arguments);
      }

      return runTestRunHooks;
    }()
  }]);
  return Slave;
}();

exports.default = Slave;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9ydW50aW1lL3BhcmFsbGVsL3NsYXZlLmpzIl0sIm5hbWVzIjpbIkVWRU5UUyIsIlNsYXZlIiwiY3dkIiwic3RkaW4iLCJzdGRvdXQiLCJpbml0aWFsaXplZCIsImV2ZW50QnJvYWRjYXN0ZXIiLCJzdGFja1RyYWNlRmlsdGVyIiwicGF0aFNlcFJlZ2V4cCIsIlJlZ0V4cCIsInNlcCIsInBhdGhUb1JlbW92ZSIsInJlcGxhY2UiLCJwb3NpeCIsInBhdGhSZWdleHAiLCJmb3JFYWNoIiwib24iLCJuYW1lIiwiZGF0YSIsInJlc3VsdCIsImV4Y2VwdGlvbiIsIkVycm9yIiwic3RhY2siLCJ3cml0ZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJjb21tYW5kIiwiRVZFTlQiLCJmaWx0ZXJTdGFja3RyYWNlcyIsInN1cHBvcnRDb2RlUmVxdWlyZWRNb2R1bGVzIiwic3VwcG9ydENvZGVQYXRocyIsIndvcmxkUGFyYW1ldGVycyIsIm1hcCIsInJlcXVpcmUiLCJtb2R1bGUiLCJyZXNldCIsImNvZGVQYXRoIiwic3VwcG9ydENvZGVMaWJyYXJ5IiwiZmluYWxpemUiLCJmaWx0ZXIiLCJydW5UZXN0UnVuSG9va3MiLCJSRUFEWSIsInVuZmlsdGVyIiwicHJvY2VzcyIsImV4aXQiLCJsaW5lIiwiaW5wdXQiLCJwYXJzZSIsImluaXRpYWxpemUiLCJydW5UZXN0Q2FzZSIsInJsIiwiY3JlYXRlSW50ZXJmYWNlIiwicGFyc2VNYXN0ZXJMaW5lIiwidGVzdENhc2UiLCJza2lwIiwidGVzdENhc2VSdW5uZXIiLCJydW4iLCJrZXkiLCJlYWNoIiwiaG9va0RlZmluaXRpb24iLCJhcmdzQXJyYXkiLCJmbiIsImNvZGUiLCJ0aGlzQXJnIiwidGltZW91dEluTWlsbGlzZWNvbmRzIiwib3B0aW9ucyIsInRpbWVvdXQiLCJkZWZhdWx0VGltZW91dCIsImVycm9yIiwibG9jYXRpb24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOztBQUNBOzs7O0FBQ0E7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxJQUFNQSxTQUFTLENBQ2Isb0JBRGEsRUFFYixtQkFGYSxFQUdiLG1CQUhhLEVBSWIsc0JBSmEsRUFLYixvQkFMYSxFQU1iLG9CQU5hLENBQWY7O0lBU3FCQyxLO0FBQ25CLHVCQUFvQztBQUFBOztBQUFBLFFBQXRCQyxHQUFzQixRQUF0QkEsR0FBc0I7QUFBQSxRQUFqQkMsS0FBaUIsUUFBakJBLEtBQWlCO0FBQUEsUUFBVkMsTUFBVSxRQUFWQSxNQUFVO0FBQUE7O0FBQ2xDLFNBQUtDLFdBQUwsR0FBbUIsS0FBbkI7QUFDQSxTQUFLRixLQUFMLEdBQWFBLEtBQWI7QUFDQSxTQUFLQyxNQUFMLEdBQWNBLE1BQWQ7QUFDQSxTQUFLRixHQUFMLEdBQVdBLEdBQVg7QUFDQSxTQUFLSSxnQkFBTCxHQUF3QixzQkFBeEI7QUFDQSxTQUFLQyxnQkFBTCxHQUF3QixrQ0FBeEI7O0FBRUEsUUFBTUMsZ0JBQWdCLElBQUlDLE1BQUosQ0FBVyxrQ0FBbUIsZUFBS0MsR0FBeEIsQ0FBWCxFQUF5QyxHQUF6QyxDQUF0QjtBQUNBLFFBQU1DLGVBQ0pULElBQUlVLE9BQUosQ0FBWUosYUFBWixFQUEyQixlQUFLSyxLQUFMLENBQVdILEdBQXRDLElBQTZDLGVBQUtHLEtBQUwsQ0FBV0gsR0FEMUQ7QUFFQSxTQUFLSSxVQUFMLEdBQWtCLElBQUlMLE1BQUosQ0FBVyxrQ0FBbUJFLFlBQW5CLENBQVgsRUFBNkMsR0FBN0MsQ0FBbEI7O0FBRUFYLFdBQU9lLE9BQVAsQ0FBZSxnQkFBUTtBQUNyQixZQUFLVCxnQkFBTCxDQUFzQlUsRUFBdEIsQ0FBeUJDLElBQXpCLEVBQStCLGdCQUFRO0FBQ3JDO0FBQ0EsWUFBSUMsS0FBS0MsTUFBTCxJQUFlRCxLQUFLQyxNQUFMLENBQVlDLFNBQVosWUFBaUNDLEtBQXBELEVBQTJEO0FBQ3pESCxlQUFLQyxNQUFMLENBQVlDLFNBQVosR0FBd0JGLEtBQUtDLE1BQUwsQ0FBWUMsU0FBWixDQUFzQkUsS0FBdEIsQ0FBNEJWLE9BQTVCLENBQ3RCLE1BQUtFLFVBRGlCLEVBRXRCLEVBRnNCLENBQXhCO0FBSUQ7O0FBRUQsZUFBTyxNQUFLVixNQUFMLENBQVltQixLQUFaLENBQ0xDLEtBQUtDLFNBQUwsQ0FBZSxFQUFFQyxTQUFTLHdCQUFhQyxLQUF4QixFQUErQlYsVUFBL0IsRUFBcUNDLFVBQXJDLEVBQWYsSUFBOEQsSUFEekQsQ0FBUDtBQUdELE9BWkQ7QUFhRCxLQWREO0FBZUQ7Ozs7OzZEQU9FO0FBQUEsWUFKRFUsaUJBSUMsU0FKREEsaUJBSUM7QUFBQSxZQUhEQywwQkFHQyxTQUhEQSwwQkFHQztBQUFBLFlBRkRDLGdCQUVDLFNBRkRBLGdCQUVDO0FBQUEsWUFEREMsZUFDQyxTQUREQSxlQUNDOztBQUNERixtQ0FBMkJHLEdBQTNCLENBQStCO0FBQUEsaUJBQVVDLFFBQVFDLE1BQVIsQ0FBVjtBQUFBLFNBQS9CO0FBQ0EsK0NBQTBCQyxLQUExQixDQUFnQyxLQUFLakMsR0FBckM7QUFDQTRCLHlCQUFpQmYsT0FBakIsQ0FBeUI7QUFBQSxpQkFBWWtCLFFBQVFHLFFBQVIsQ0FBWjtBQUFBLFNBQXpCO0FBQ0EsYUFBS0Msa0JBQUwsR0FBMEIsdUNBQTBCQyxRQUExQixFQUExQjtBQUNBLGFBQUtQLGVBQUwsR0FBdUJBLGVBQXZCO0FBQ0EsYUFBS0gsaUJBQUwsR0FBeUJBLGlCQUF6QjtBQUNBLFlBQUksS0FBS0EsaUJBQVQsRUFBNEI7QUFDMUIsZUFBS3JCLGdCQUFMLENBQXNCZ0MsTUFBdEI7QUFDRDtBQUNELGNBQU0sS0FBS0MsZUFBTCxDQUFxQiw4QkFBckIsRUFBcUQsYUFBckQsQ0FBTjtBQUNBLGFBQUtwQyxNQUFMLENBQVltQixLQUFaLENBQWtCQyxLQUFLQyxTQUFMLENBQWUsRUFBRUMsU0FBUyx3QkFBYWUsS0FBeEIsRUFBZixJQUFrRCxJQUFwRTtBQUNELE87Ozs7Ozs7Ozs7O3dEQUVnQjtBQUNmLGNBQU0sS0FBS0QsZUFBTCxDQUFxQiw2QkFBckIsRUFBb0QsYUFBcEQsQ0FBTjtBQUNBLFlBQUksS0FBS1osaUJBQVQsRUFBNEI7QUFDMUIsZUFBS3JCLGdCQUFMLENBQXNCbUMsUUFBdEI7QUFDRDtBQUNEQyxnQkFBUUMsSUFBUjtBQUNELE87Ozs7Ozs7Ozs7b0NBRWVDLEksRUFBTTtBQUNwQixVQUFNQyxRQUFRdEIsS0FBS3VCLEtBQUwsQ0FBV0YsSUFBWCxDQUFkO0FBQ0EsVUFBSUMsTUFBTXBCLE9BQU4sS0FBa0IsWUFBdEIsRUFBb0M7QUFDbEMsYUFBS3NCLFVBQUwsQ0FBZ0JGLEtBQWhCO0FBQ0QsT0FGRCxNQUVPLElBQUlBLE1BQU1wQixPQUFOLEtBQWtCLFVBQXRCLEVBQWtDO0FBQ3ZDLGFBQUtZLFFBQUw7QUFDRCxPQUZNLE1BRUEsSUFBSVEsTUFBTXBCLE9BQU4sS0FBa0IsS0FBdEIsRUFBNkI7QUFDbEMsYUFBS3VCLFdBQUwsQ0FBaUJILEtBQWpCO0FBQ0Q7QUFDRjs7Ozt3REFFVztBQUFBOztBQUNWLGFBQUtJLEVBQUwsR0FBVSxtQkFBU0MsZUFBVCxDQUF5QixFQUFFTCxPQUFPLEtBQUszQyxLQUFkLEVBQXpCLENBQVY7QUFDQSxhQUFLK0MsRUFBTCxDQUFRbEMsRUFBUixDQUFXLE1BQVgsRUFBbUIsZ0JBQVE7QUFDekIsaUJBQUtvQyxlQUFMLENBQXFCUCxJQUFyQjtBQUNELFNBRkQ7QUFHRCxPOzs7Ozs7Ozs7Ozs2REFFcUM7QUFBQSxZQUFsQlEsUUFBa0IsU0FBbEJBLFFBQWtCO0FBQUEsWUFBUkMsSUFBUSxTQUFSQSxJQUFROztBQUNwQyxZQUFNQyxpQkFBaUIsK0JBQW1CO0FBQ3hDakQsNEJBQWtCLEtBQUtBLGdCQURpQjtBQUV4Q2dELG9CQUZ3QztBQUd4Q2pCLDhCQUFvQixLQUFLQSxrQkFIZTtBQUl4Q2dCLDRCQUp3QztBQUt4Q3RCLDJCQUFpQixLQUFLQTtBQUxrQixTQUFuQixDQUF2QjtBQU9BLGNBQU13QixlQUFlQyxHQUFmLEVBQU47QUFDQSxhQUFLcEQsTUFBTCxDQUFZbUIsS0FBWixDQUFrQkMsS0FBS0MsU0FBTCxDQUFlLEVBQUVDLFNBQVMsd0JBQWFlLEtBQXhCLEVBQWYsSUFBa0QsSUFBcEU7QUFDRCxPOzs7Ozs7Ozs7OztzREFFcUJnQixHLEVBQUt4QyxJLEVBQU07QUFBQTs7QUFDL0IsY0FBTSxtQkFBUXlDLElBQVIsQ0FBYSxLQUFLckIsa0JBQUwsQ0FBd0JvQixHQUF4QixDQUFiO0FBQUEsK0NBQTJDLFdBQU1FLGNBQU4sRUFBd0I7QUFBQSx5QkFDckQsTUFBTSwyQkFBZUgsR0FBZixDQUFtQjtBQUN6Q0kseUJBQVcsRUFEOEI7QUFFekNDLGtCQUFJRixlQUFlRyxJQUZzQjtBQUd6Q0MsdUJBQVMsSUFIZ0M7QUFJekNDLHFDQUNFTCxlQUFlTSxPQUFmLENBQXVCQyxPQUF2QixJQUNBLE9BQUs3QixrQkFBTCxDQUF3QjhCO0FBTmUsYUFBbkIsQ0FEK0M7QUFBQSxnQkFDL0RDLEtBRCtELFVBQy9EQSxLQUQrRDs7QUFTdkUsZ0JBQUlBLEtBQUosRUFBVztBQUNULGtCQUFNQyxXQUFXLDZCQUFlVixjQUFmLENBQWpCO0FBQ0Esb0JBQU0scUJBQ0pTLEtBREksRUFFRG5ELElBRkMsd0NBRXNDb0QsUUFGdEMsQ0FBTjtBQUlEO0FBQ0YsV0FoQks7O0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFBTjtBQWlCRCxPOzs7Ozs7Ozs7Ozs7a0JBMUdrQnBFLEsiLCJmaWxlIjoic2xhdmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JtYXRMb2NhdGlvbiB9IGZyb20gJy4uLy4uL2Zvcm1hdHRlci9oZWxwZXJzJ1xuaW1wb3J0IGNvbW1hbmRUeXBlcyBmcm9tICcuL2NvbW1hbmRfdHlwZXMnXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cydcbmltcG9ydCBQcm9taXNlIGZyb20gJ2JsdWViaXJkJ1xuaW1wb3J0IHJlYWRsaW5lIGZyb20gJ3JlYWRsaW5lJ1xuaW1wb3J0IFN0YWNrVHJhY2VGaWx0ZXIgZnJvbSAnLi4vc3RhY2tfdHJhY2VfZmlsdGVyJ1xuaW1wb3J0IHN1cHBvcnRDb2RlTGlicmFyeUJ1aWxkZXIgZnJvbSAnLi4vLi4vc3VwcG9ydF9jb2RlX2xpYnJhcnlfYnVpbGRlcidcbmltcG9ydCBUZXN0Q2FzZVJ1bm5lciBmcm9tICcuLi90ZXN0X2Nhc2VfcnVubmVyJ1xuaW1wb3J0IFVzZXJDb2RlUnVubmVyIGZyb20gJy4uLy4uL3VzZXJfY29kZV9ydW5uZXInXG5pbXBvcnQgVkVycm9yIGZyb20gJ3ZlcnJvcidcbmltcG9ydCBlc2NhcGVTdHJpbmdSZWdleHAgZnJvbSAnZXNjYXBlLXN0cmluZy1yZWdleHAnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5jb25zdCBFVkVOVFMgPSBbXG4gICd0ZXN0LWNhc2UtcHJlcGFyZWQnLFxuICAndGVzdC1jYXNlLXN0YXJ0ZWQnLFxuICAndGVzdC1zdGVwLXN0YXJ0ZWQnLFxuICAndGVzdC1zdGVwLWF0dGFjaG1lbnQnLFxuICAndGVzdC1zdGVwLWZpbmlzaGVkJyxcbiAgJ3Rlc3QtY2FzZS1maW5pc2hlZCcsXG5dXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNsYXZlIHtcbiAgY29uc3RydWN0b3IoeyBjd2QsIHN0ZGluLCBzdGRvdXQgfSkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZVxuICAgIHRoaXMuc3RkaW4gPSBzdGRpblxuICAgIHRoaXMuc3Rkb3V0ID0gc3Rkb3V0XG4gICAgdGhpcy5jd2QgPSBjd2RcbiAgICB0aGlzLmV2ZW50QnJvYWRjYXN0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKClcbiAgICB0aGlzLnN0YWNrVHJhY2VGaWx0ZXIgPSBuZXcgU3RhY2tUcmFjZUZpbHRlcigpXG5cbiAgICBjb25zdCBwYXRoU2VwUmVnZXhwID0gbmV3IFJlZ0V4cChlc2NhcGVTdHJpbmdSZWdleHAocGF0aC5zZXApLCAnZycpXG4gICAgY29uc3QgcGF0aFRvUmVtb3ZlID1cbiAgICAgIGN3ZC5yZXBsYWNlKHBhdGhTZXBSZWdleHAsIHBhdGgucG9zaXguc2VwKSArIHBhdGgucG9zaXguc2VwXG4gICAgdGhpcy5wYXRoUmVnZXhwID0gbmV3IFJlZ0V4cChlc2NhcGVTdHJpbmdSZWdleHAocGF0aFRvUmVtb3ZlKSwgJ2cnKVxuXG4gICAgRVZFTlRTLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICB0aGlzLmV2ZW50QnJvYWRjYXN0ZXIub24obmFtZSwgZGF0YSA9PiB7XG4gICAgICAgIC8vIEZvcm1hdCBlcnJvciBpbnN0YW5jZVxuICAgICAgICBpZiAoZGF0YS5yZXN1bHQgJiYgZGF0YS5yZXN1bHQuZXhjZXB0aW9uIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICBkYXRhLnJlc3VsdC5leGNlcHRpb24gPSBkYXRhLnJlc3VsdC5leGNlcHRpb24uc3RhY2sucmVwbGFjZShcbiAgICAgICAgICAgIHRoaXMucGF0aFJlZ2V4cCxcbiAgICAgICAgICAgICcnXG4gICAgICAgICAgKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc3Rkb3V0LndyaXRlKFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgY29tbWFuZDogY29tbWFuZFR5cGVzLkVWRU5ULCBuYW1lLCBkYXRhIH0pICsgJ1xcbidcbiAgICAgICAgKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZSh7XG4gICAgZmlsdGVyU3RhY2t0cmFjZXMsXG4gICAgc3VwcG9ydENvZGVSZXF1aXJlZE1vZHVsZXMsXG4gICAgc3VwcG9ydENvZGVQYXRocyxcbiAgICB3b3JsZFBhcmFtZXRlcnMsXG4gIH0pIHtcbiAgICBzdXBwb3J0Q29kZVJlcXVpcmVkTW9kdWxlcy5tYXAobW9kdWxlID0+IHJlcXVpcmUobW9kdWxlKSlcbiAgICBzdXBwb3J0Q29kZUxpYnJhcnlCdWlsZGVyLnJlc2V0KHRoaXMuY3dkKVxuICAgIHN1cHBvcnRDb2RlUGF0aHMuZm9yRWFjaChjb2RlUGF0aCA9PiByZXF1aXJlKGNvZGVQYXRoKSlcbiAgICB0aGlzLnN1cHBvcnRDb2RlTGlicmFyeSA9IHN1cHBvcnRDb2RlTGlicmFyeUJ1aWxkZXIuZmluYWxpemUoKVxuICAgIHRoaXMud29ybGRQYXJhbWV0ZXJzID0gd29ybGRQYXJhbWV0ZXJzXG4gICAgdGhpcy5maWx0ZXJTdGFja3RyYWNlcyA9IGZpbHRlclN0YWNrdHJhY2VzXG4gICAgaWYgKHRoaXMuZmlsdGVyU3RhY2t0cmFjZXMpIHtcbiAgICAgIHRoaXMuc3RhY2tUcmFjZUZpbHRlci5maWx0ZXIoKVxuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJ1blRlc3RSdW5Ib29rcygnYmVmb3JlVGVzdFJ1bkhvb2tEZWZpbml0aW9ucycsICdhIEJlZm9yZUFsbCcpXG4gICAgdGhpcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBjb21tYW5kOiBjb21tYW5kVHlwZXMuUkVBRFkgfSkgKyAnXFxuJylcbiAgfVxuXG4gIGFzeW5jIGZpbmFsaXplKCkge1xuICAgIGF3YWl0IHRoaXMucnVuVGVzdFJ1bkhvb2tzKCdhZnRlclRlc3RSdW5Ib29rRGVmaW5pdGlvbnMnLCAnYW4gQWZ0ZXJBbGwnKVxuICAgIGlmICh0aGlzLmZpbHRlclN0YWNrdHJhY2VzKSB7XG4gICAgICB0aGlzLnN0YWNrVHJhY2VGaWx0ZXIudW5maWx0ZXIoKVxuICAgIH1cbiAgICBwcm9jZXNzLmV4aXQoKVxuICB9XG5cbiAgcGFyc2VNYXN0ZXJMaW5lKGxpbmUpIHtcbiAgICBjb25zdCBpbnB1dCA9IEpTT04ucGFyc2UobGluZSlcbiAgICBpZiAoaW5wdXQuY29tbWFuZCA9PT0gJ2luaXRpYWxpemUnKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemUoaW5wdXQpXG4gICAgfSBlbHNlIGlmIChpbnB1dC5jb21tYW5kID09PSAnZmluYWxpemUnKSB7XG4gICAgICB0aGlzLmZpbmFsaXplKClcbiAgICB9IGVsc2UgaWYgKGlucHV0LmNvbW1hbmQgPT09ICdydW4nKSB7XG4gICAgICB0aGlzLnJ1blRlc3RDYXNlKGlucHV0KVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJ1bigpIHtcbiAgICB0aGlzLnJsID0gcmVhZGxpbmUuY3JlYXRlSW50ZXJmYWNlKHsgaW5wdXQ6IHRoaXMuc3RkaW4gfSlcbiAgICB0aGlzLnJsLm9uKCdsaW5lJywgbGluZSA9PiB7XG4gICAgICB0aGlzLnBhcnNlTWFzdGVyTGluZShsaW5lKVxuICAgIH0pXG4gIH1cblxuICBhc3luYyBydW5UZXN0Q2FzZSh7IHRlc3RDYXNlLCBza2lwIH0pIHtcbiAgICBjb25zdCB0ZXN0Q2FzZVJ1bm5lciA9IG5ldyBUZXN0Q2FzZVJ1bm5lcih7XG4gICAgICBldmVudEJyb2FkY2FzdGVyOiB0aGlzLmV2ZW50QnJvYWRjYXN0ZXIsXG4gICAgICBza2lwLFxuICAgICAgc3VwcG9ydENvZGVMaWJyYXJ5OiB0aGlzLnN1cHBvcnRDb2RlTGlicmFyeSxcbiAgICAgIHRlc3RDYXNlLFxuICAgICAgd29ybGRQYXJhbWV0ZXJzOiB0aGlzLndvcmxkUGFyYW1ldGVycyxcbiAgICB9KVxuICAgIGF3YWl0IHRlc3RDYXNlUnVubmVyLnJ1bigpXG4gICAgdGhpcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyBjb21tYW5kOiBjb21tYW5kVHlwZXMuUkVBRFkgfSkgKyAnXFxuJylcbiAgfVxuXG4gIGFzeW5jIHJ1blRlc3RSdW5Ib29rcyhrZXksIG5hbWUpIHtcbiAgICBhd2FpdCBQcm9taXNlLmVhY2godGhpcy5zdXBwb3J0Q29kZUxpYnJhcnlba2V5XSwgYXN5bmMgaG9va0RlZmluaXRpb24gPT4ge1xuICAgICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgVXNlckNvZGVSdW5uZXIucnVuKHtcbiAgICAgICAgYXJnc0FycmF5OiBbXSxcbiAgICAgICAgZm46IGhvb2tEZWZpbml0aW9uLmNvZGUsXG4gICAgICAgIHRoaXNBcmc6IG51bGwsXG4gICAgICAgIHRpbWVvdXRJbk1pbGxpc2Vjb25kczpcbiAgICAgICAgICBob29rRGVmaW5pdGlvbi5vcHRpb25zLnRpbWVvdXQgfHxcbiAgICAgICAgICB0aGlzLnN1cHBvcnRDb2RlTGlicmFyeS5kZWZhdWx0VGltZW91dCxcbiAgICAgIH0pXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSBmb3JtYXRMb2NhdGlvbihob29rRGVmaW5pdGlvbilcbiAgICAgICAgdGhyb3cgbmV3IFZFcnJvcihcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgICBgJHtuYW1lfSBob29rIGVycm9yZWQsIHByb2Nlc3MgZXhpdGluZzogJHtsb2NhdGlvbn1gXG4gICAgICAgIClcbiAgICAgIH1cbiAgICB9KVxuICB9XG59Il19