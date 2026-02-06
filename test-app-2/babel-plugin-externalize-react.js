/**
 * Babel plugin to externalize React and React Native
 * Transforms: import React from 'react'
 * Into: const React = global.React
 */

module.exports = function () {
  return {
    name: 'externalize-react',
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        // Handle React imports
        if (source === 'react') {
          const specifiers = path.node.specifiers;
          const declarations = [];

          specifiers.forEach(specifier => {
            if (specifier.type === 'ImportDefaultSpecifier') {
              // import React from 'react' -> const React = global.React
              declarations.push(
                this.types.variableDeclaration('const', [
                  this.types.variableDeclarator(
                    this.types.identifier(specifier.local.name),
                    this.types.memberExpression(
                      this.types.identifier('global'),
                      this.types.identifier('React')
                    )
                  )
                ])
              );
            } else if (specifier.type === 'ImportSpecifier') {
              // import { useState } from 'react' -> const { useState } = global.React
              declarations.push(
                this.types.variableDeclaration('const', [
                  this.types.variableDeclarator(
                    this.types.objectPattern([
                      this.types.objectProperty(
                        this.types.identifier(specifier.imported.name),
                        this.types.identifier(specifier.local.name),
                        false,
                        true
                      )
                    ]),
                    this.types.memberExpression(
                      this.types.identifier('global'),
                      this.types.identifier('React')
                    )
                  )
                ])
              );
            }
          });

          path.replaceWithMultiple(declarations);
        }

        // Handle React Native imports
        if (source === 'react-native') {
          const specifiers = path.node.specifiers;
          const properties = specifiers
            .filter(s => s.type === 'ImportSpecifier')
            .map(specifier =>
              this.types.objectProperty(
                this.types.identifier(specifier.imported.name),
                this.types.identifier(specifier.local.name),
                false,
                true
              )
            );

          if (properties.length > 0) {
            // import { View, Text } from 'react-native' -> const { View, Text } = global.ReactNative
            path.replaceWith(
              this.types.variableDeclaration('const', [
                this.types.variableDeclarator(
                  this.types.objectPattern(properties),
                  this.types.memberExpression(
                    this.types.identifier('global'),
                    this.types.identifier('ReactNative')
                  )
                )
              ])
            );
          }
        }
      }
    }
  };
};
