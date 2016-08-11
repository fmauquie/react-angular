# react-angular
Use AngularJS 1.x templates in react components

When converting an application from Angular to React, or using React in an Angular application,
we usually use `ngReact` to embed our React components.
However, it it then close to impossible to use existing AngularJS directives inside the React components.

Or rather, it was…

`ReactAngular` allows you to use AngularJS templates, directives, controllers and services inside a React component.
It does so by providing a React component, called `ReactAngular`,
to which you pass the template and controller you want to use.

## Installation

```sh
npm install react-angular
```

`ReactAngular` requires React and Angular (of course!),
although it isn't materialized in dependencies.

It should work fine with React 0.14+ and Angular 1.2+,
but is really only tested with React 15 and Angular 1.5.

## Usage
```js
import React from 'react';
import ReactAngular from 'react-angular';

import styles from './someStyles.css';
import template from './someTemplate.[pug,jade,html]';
import controller from './someController';

export default function SomeComponent(props) {
  return <ReactAngular
    className={styles.wrapper}
    template={template}
    controller={controller}
    controllerAs="ctl"
    inject={props}/>
}
```

`ReactAngular` will render the AngularJS template in a wrapper `div`.
The wrapper `div` is fully customizable (see Advanced Usage below).

Once the template rendered, `ReactAngular` will leave the control to AngularJS for the template updates.
Props updates will _not_ be applied.

The AngularJS application must already be started
(module must be defined and `ng-app` must be present on a parent element).

## Basic Props

### className: `String`
The class to apply to the wrapper `div`.

This allows you to control how the wrapper (and the directive inside it) is displayed in your page.

### controller: `String|Function`
The controller to apply to the template. This is a definition of a controller as in any AngularJS template or route.

This may be:
- A controller name (`String`): The controller will be found in the controllers declared in the AngularJS application
- A controller constructor (`Function`): The controller constructor will be used as-is.
- A "controllerAs" expression (`String`): The controller will be instantiated from the AngularJS application and bound to the scope.

Controller will be injected with the scope,
the wrapper element,
the services defined in the application
and all properties defined in the `inject` prop.

### controllerAs: `String`
Bind the controller to a variable in the scope. This is like the `controllerAs` parameter in route definitions.

This is the preferred way to bind a controller to a template.
An alternative is to use the "controllerAs" syntax in the `controller` prop.

### inject: `Object`
A key-value pair of data to inject into the controller.

If the template is a function (e.g. a Pug/Jade template), the values defined here will also be passed to the template function.

Example:

`controller.js`:
```js
/* @ngInject */
export default function MyController($document, someClass) {
  this.hasClass = $document.find('body').hasClass(someClass);
}
```
`MyComponent.jsx`:
```js
import React from 'react';
import ReactAngular from 'ReactAngular';

import controler from './controller';

export default function MyComponent(props) {
  return <ReactAngular
    template="<div ng-class='{ active: doc.hasClass }'></div>"
    controller={controller}
    controllerAs="doc"
  />;
}
```

### isolate: `Boolean`
Create an isolate scope instead of a normal scope.

You may use this to enforce component isolation at the AngularJS level.

### scope: `Boolean|Object`
Should a scope be created for the wrapper element ?

By default a scope will be created. You can prevent this by passing `false` to this prop.

You should not pass `false` if you are using a controller.

If you pass an object, any value in the object will be copied to the created scope.

Example:
```js
import React from 'react';
import ReactAngular from 'ReactAngular';

export default function MyComponent(props) {
  return <ReactAngular
    template="<div ng-bind='someValue'></div>"
    scope={{
      someValue: props.value || 'unknown',
    }}
  />;
}
```

### template: `String|Function`
The template to use.

You can specify a string (loaded from HTML or directly in the prop),
or a function (generated in JS or a Pug/Jade import).

If you specify a function, the object provided in `inject` will be passed as the first argument.

If both are `template` and `templateUrl` are specified, `template` will be used.

### templateUrl: `String`
Use a template from Angular's template cache.
This allows you to use a template loader or template scripts as the template source.

If both are `template` and `templateUrl` are specified, `template` will be used.

### wrapperTag: `String`
The wrapper tag to use. By default it is a `div`.

You can change it to a `span` or anything else,
even an element directive (see Advanced Usage below).

### wrapperAttrs: `Object`
Attributes to apply to the wrapper element.

These will be passed as in JSX, e.g. all non-standard attributes have to be prefixed with `data-`.
No transformation will be applied to the attributes, so they have to be passed as in HTML
(e.g. pass `data-ng-bind`, not 'ngBind').

## Known Caveats and Limitations

### Property flow
Since AngularJS and React have a different approach to updating the DOM,
property updates will _not_ be propagated to the managed scope or controller.

You should *never* count on Angular updating a property passed to `ReactAngular`,
although `ReactAngular` does not do anything to prevent it.

If you want to watch scope changes, you should reference the `ReactAngular` instance and add watchers to the scope
(see Advanced Usage below).

### Using `require()`
Since the library is written in ES6 and transpiled with Babel,
when using `require()` instead of `import` to import it,
you must explicitly ask for the default export:
```js
var ReactAngular = require('react-angular').default;
```

### Wrapper Element Manipulation
The wrapper element is managed by React,
so any outside change to it will cause React to warn and potentially fail to render.
See Advanced Usage below for a discussion on wrapper tag management and DOM access to the element.

## Advanced Usage

### Wrapper element
By manipulating the wrapper tag (`wrapperTag` and `wrapperAttrs` props),
you can declare attribute directives directly on the wrapper element (e.g. `data-ng-bind`),
or even insert an element directive directly as the wrapper tag.

Be careful when you do this. As this element is managed by React, any transformation will result in React
screaming out. So directives that transform their element will result in strange behavior and React warnings.

This includes:
- `transclude: 'element'` and `replace: true` directives, like `ngIf` or `ngRepeat`
- Directives that manipulate the DOM directly, in either `compile` or `link`, like `ngClass`, `ngShow` or `ngHide`

In many instances it is easier and more secure to just add a class to the wrapper `div` using the `className` prop,
or to change the wrapper element to a `span` using the `wrapperTag` prop.

### API
By referencing the `ReactAngular` component,
you can get access to several component attributes that allow you to manipulate the created AngularJS structure:

- `$scope`: This is the scope used to compile the wrapper tag and the template.
  You can use this to add watchers or event handlers, or to send events.
- `$element`: This is the wrapper element as a JQLite element.
  You can use this to further manipulate or query the DOM.

Example:
```js
import React from 'react';
import ReactAngular from 'ReactAngular';

export default class MyComponent {
  componentDidMount() {
    this.reactAngular.$scope.$watch(
      'someValue',
       (newValue) => console.log(newValue)
     );
  }

  render() {
    return <ReactAngular
      ref={(reactAngular) => this.reactAngular = reactAngular}
      template="<div ng-click='someValue++'></div>"
      scope={{
        someValue: props.value || 'unknown',
      }}
    />;
  }
}
```

## Roadmap
- Support for easily creating "directive components",
  e.g. the inverse of ngReact's reactDirective function
- Better doc (this one is kinda messy, although pretty much complete)
- Support other module loaders?

## Contributing
Contributions to the documentation and the code are welcome, just make a PR!

Remember to contribute the test along with the feature (or the test that shows up the bug).

## Authors and license
This library is licenced under the MIT licence (see LICENCE file).

Authors:
- Fabien Mauquié
