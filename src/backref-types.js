'use strict';

const _get = require('lodash.get');
const { GraphQLObjectType, GraphQLList } = require('graphql');
const { WebPageType } = require('./base-types.js');

module.exports = createBackrefsType;

function createBackrefsType(ct, ctIdToType) {
  const fields = prepareBackrefsFields(ct, ctIdToType);
  if (Object.keys(fields).length > 0) {
    return new GraphQLObjectType({ name: ct.names.backrefsType, fields });
  }
}

function prepareBackrefsFields(ct, ctIdToType) {
  return (ct.backrefs || []).reduce((acc, backref) => {
    const Type = ctIdToType[backref.ctId];
    if (Type) {
      acc[backref.backrefFieldName] = createBackrefFieldConfig(backref, Type);
    } 
    if (backref.ctId === 'basePage') {
      acc[backref.backrefFieldName] = {
        type: new GraphQLList(WebPageType),
        resolve: (entryId, _, ctx) => {
          return ctx.entryLoader.queryBasePages(backref.ctId, Type['_typeConfig'].referenceFields)
            .then(entries => {
            return filterEntries(entries, backref.fieldId, entryId);
          });
        }
      };
    }
    return acc;
  }, {});
}

function createBackrefFieldConfig(backref, Type) {
  return {
    type: new GraphQLList(Type),
    resolve: (entryId, _, ctx) => {
      return ctx.entryLoader.queryAll(backref.ctId, Type['_typeConfig'].referenceFields)
      .then(entries => filterEntries(entries, backref.fieldId, entryId));
    }
  };
}

function filterEntries(entries, refFieldId, entryId) {
  return entries.filter(entry => {
    const refField = _get(entry, ['fields', refFieldId]);

    if (Array.isArray(refField)) {
      return !!refField.find(link => _get(link, ['sys', 'id']) === entryId);
    } else if (typeof refField === 'object') {
      return _get(refField, ['sys', 'id']) === entryId;
    } else {
      return false;
    }
  });
}
