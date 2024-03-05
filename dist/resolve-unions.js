"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = resolveUnions;

var _lodash = require("lodash");

var _util = require("./util");

function resolveUnions(data, sqlAST) {
  if (!data || Array.isArray(data) && data.length === 0) {
    return;
  }

  if (sqlAST.type === 'union') {
    for (let typeName in sqlAST.typedChildren) {
      const suffix = '@' + typeName;
      const children = sqlAST.typedChildren[typeName];

      for (let child of children) {
        const fieldName = child.fieldName;
        const qualifiedName = child.fieldName + suffix;

        if (Array.isArray(data)) {
          for (let obj of data) {
            disambiguateQualifiedTypeFields(obj, child, typeName, qualifiedName, fieldName);
          }

          if (child.type === 'table' || child.type === 'union') {
            const nextLevelData = (0, _lodash.chain)(data).filter(obj => obj != null).flatMap(obj => obj[fieldName]).filter(obj => obj != null).value();
            resolveUnions(nextLevelData, child);
          }
        } else {
          disambiguateQualifiedTypeFields(data, child, typeName, qualifiedName, fieldName);

          if (child.type === 'table' || child.type === 'union') {
            resolveUnions(data[fieldName], child);
          }
        }
      }
    }
  }

  if (sqlAST.type === 'table' || sqlAST.type === 'union') {
    for (let child of sqlAST.children) {
      if ((child.type === 'table' || child.type === 'union') && !child.sqlBatch) {
        const fieldName = child.fieldName;

        if (Array.isArray(data)) {
          const nextLevelData = (0, _lodash.chain)(data).filter(obj => obj != null).flatMap(obj => obj[fieldName]).filter(obj => obj != null).value();
          resolveUnions(nextLevelData, child);
        } else {
          resolveUnions(data[fieldName], child);
        }
      }
    }
  }
}

const disambiguateQualifiedTypeFields = (data, childASTsql, typeName, qualifiedName, requestedFieldName) => {
  const discriminatorTypeName = childASTsql.defferedFrom?.resolveType ? childASTsql.defferedFrom.resolveType(data) : null;
  const qualifiedValue = data[qualifiedName];
  delete data[qualifiedName];

  if (discriminatorTypeName && typeName !== discriminatorTypeName) {
    return;
  }

  if (data[requestedFieldName] == null && qualifiedValue != null) {
    data[requestedFieldName] = qualifiedValue;
  } else if ((0, _util.isEmptyArray)(data[requestedFieldName]) && !(0, _util.isEmptyArray)(qualifiedValue)) {
    data[requestedFieldName] = qualifiedValue;
  }
};