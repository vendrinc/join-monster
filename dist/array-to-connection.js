"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _graphqlRelay = require("graphql-relay");

var _util = require("./util");

function arrToConnection(data, sqlAST) {
  for (let astChild of sqlAST.children || []) {
    if (Array.isArray(data)) {
      for (let dataItem of data) {
        recurseOnObjInData(dataItem, astChild);
      }
    } else if (data) {
      recurseOnObjInData(data, astChild);
    }
  }

  if (sqlAST.typedChildren) {
    for (let astType in sqlAST.typedChildren) {
      if (Object.prototype.hasOwnProperty.call(sqlAST.typedChildren, astType)) {
        for (let astChild of sqlAST.typedChildren[astType] || []) {
          if (Array.isArray(data)) {
            for (let dataItem of data) {
              recurseOnObjInData(dataItem, astChild);
            }
          } else if (data) {
            recurseOnObjInData(data, astChild);
          }
        }
      }
    }
  }

  const pageInfo = {
    hasNextPage: false,
    hasPreviousPage: false
  };

  if (!data) {
    if (sqlAST.paginate) {
      return {
        pageInfo,
        edges: []
      };
    }

    return null;
  }

  if (sqlAST.paginate && !data._paginated) {
    var _ref6;

    if (sqlAST.sortKey || ((_ref6 = sqlAST) != null ? (_ref6 = _ref6.junction) != null ? _ref6.sortKey : _ref6 : _ref6)) {
      var _ref4, _ref5;

      if ((_ref5 = sqlAST) != null ? (_ref5 = _ref5.args) != null ? _ref5.first : _ref5 : _ref5) {
        if (data.length > sqlAST.args.first) {
          pageInfo.hasNextPage = true;
          data.pop();
        }
      } else if (sqlAST.args && sqlAST.args.last) {
        if (data.length > sqlAST.args.last) {
          pageInfo.hasPreviousPage = true;
          data.pop();
        }

        data.reverse();
      } else if ((_ref4 = sqlAST) != null ? _ref4.defaultPageSize : _ref4) {
        if (data.length > sqlAST.defaultPageSize) {
          pageInfo.hasNextPage = true;
          data.pop();
        }
      }

      const sortKey = sqlAST.sortKey || sqlAST.junction.sortKey;
      const edges = data.map(obj => {
        const cursor = {};

        for (let column of (0, _util.sortKeyColumns)(sortKey)) {
          cursor[column] = obj[column];
        }

        return {
          cursor: (0, _util.objToCursor)(cursor),
          node: obj
        };
      });

      if (data.length) {
        pageInfo.startCursor = edges[0].cursor;
        pageInfo.endCursor = (0, _util.last)(edges).cursor;
      }

      return {
        edges,
        pageInfo,
        _paginated: true
      };
    }

    if (sqlAST.orderBy || sqlAST.junction && sqlAST.junction.orderBy) {
      var _ref, _ref2, _ref3;

      let offset = 0;

      if ((_ref3 = sqlAST) != null ? (_ref3 = _ref3.args) != null ? _ref3.after : _ref3 : _ref3) {
        offset = (0, _graphqlRelay.cursorToOffset)(sqlAST.args.after) + 1;
      }

      const arrayLength = data[0] && parseInt(data[0].$total, 10);
      let defaultArgs = sqlAST.args;

      if (((_ref2 = sqlAST) != null ? _ref2.defaultPageSize : _ref2) && !((_ref = defaultArgs) != null ? _ref.first : _ref)) {
        defaultArgs.first = sqlAST.defaultPageSize;
      }

      const connection = (0, _graphqlRelay.connectionFromArraySlice)(data, defaultArgs, {
        sliceStart: offset,
        arrayLength
      });
      connection.total = arrayLength || 0;
      connection._paginated = true;
      return connection;
    }
  }

  return data;
}

var _default = arrToConnection;
exports.default = _default;

function recurseOnObjInData(dataObj, astChild) {
  const dataChild = dataObj[astChild.fieldName];

  if (dataChild) {
    dataObj[astChild.fieldName] = arrToConnection(dataObj[astChild.fieldName], astChild);
  }
}