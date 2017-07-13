# react-angular
Use AngularJS 1.x templates in react components

When converting an application from Angular to React, or using React in an Angular application,
we usually use `ngReact` to embed our React components.
However, it is then close to impossible to use existing AngularJS directives inside the React components.

Or rather, it was…

`ReactAngular` allows you to use AngularJS templates, directives, controllers and services inside a React component.
It does so by providing a React component, called `AngularTemplate`,
to which you pass the template and controller you want to use.

## Installation

```sh
npm install react-angular
```

`ReactAngular` requires React and Angular (of course!),
although it isn't materialized in dependencies.

It should work fine with React 0.14+ and Angular 1.2+,
but is really only tested with React 15 and Angular 1.5.

Once installed, create the `react-angular` module and add it to your module's dependencies:

```js
import { reactAngularModule } from 'react-angular';

// If you are using ngReact
angular.module('app', [reactAngularModule(true).name])
  // ...
  ;

// If you are NOT using ngReact
angular.module('app', [reactAngularModule(false).name])
  // ...
  ;
```

## Usage
### Rendering JSX Children
```js
import React from 'react';
import AngularTemplate from 'react-angular';

export default function SomeComponent(props) {
  return (<AngularTemplate scope={{
    label: props.label,
    onClick: ($event) => console.log($event),
  }}>
    <div data-ng-click="onClick($event)">{'{{label}}'}</div>
  </AngularTemplate>);
}
```

Contrary to template rendering, `AngularTemplate` will _not_ wrap your child into a wrapper `div`.

There can only be one child to `AngularTemplate`.

Once the template is rendered, `AngularTemplate` will leave the control to AngularJS for DOM updates.
Props updates will _not_ be applied.

The AngularJS application must already be started
(Angular module must be defined and `ng-app` must be present on a parent element).

There are a number of React rendering gotchas you must be aware of when using JSX to render AngularJS templates:
- Angular's `{{}}` expression syntax has meaning in JSX.
  The easiest way to use an expression is to pass a string with the expression in it
  (like in the example above: `{'{{label}}'}`).
- React will treat an HTML tag with a dash in it (like a _lot_ of directives) to be custom components.
  On custom components attributes transformation does not happen, e.g.:
  - `className` should be written `class` again (this is important: `className` will _not_ work)
  - There is no need to prefix custom attributes with `data-`
- Do not try to reference the first child with `ref`. `AngularTemplate` will 'steal' the reference.
  Instead reference `AngularTemplate` and access the first child through `$element` (see API below).

### Rendering a Template
```js
import React from 'react';
import AngularTemplate from 'react-angular';

import styles from './someStyles.css';
import template from './someTemplate.[pug,jade,html]';
import controller from './someController';

export default function SomeComponent(props) {
  return <AngularTemplate
    className={styles.wrapper}
    template={template}
    controller={controller}
    controllerAs="ctl"
    inject={props}/>
}
```

`AngularTemplate` will render the AngularJS template in a wrapper `div`.
The wrapper `div` is fully customizable (see Advanced Usage below).

Once the template is rendered, `AngularTemplate` will leave the control to AngularJS for DOM updates.
Props updates will _not_ be applied.

The AngularJS application must already be started
(Angular module must be defined and `ng-app` must be present on a parent element).

## Running in production
In production you should be using `$compileProvider.debugInfoEnabled(false);` as explained in AngularJS documentation.

This may break AngularTemplate, so you need to test it before shipping!

If you're using `ngReact` to embed React components in AngularJS,
and declared it when adding the react-angular module to your dependencies,
you do not need to worry: react-angular takes care of ensuring it has everything it needs.

If you are using `ReactDOM.render()` in a custom directive, you need to wrap your React root component in a HOC
and provide the directive scope to it:

```js
import { provideAngularScopeHOC } from 'react-angular';
import { MyRootComponent } from './MyRootComponent';

const MyRootComponentWithScope = provideAngularScopeHOC(MyRootComponent);

angular.module('my-module', [])
  .directive('myDirective', () => ($scope, $element) => {
      ReactDOM.render(<MyRootComponent prop1="toto" $scope={$scope} />, $element[0]);
      // -- OR --
      ReactDOM.render(React.createElement(MyRootComponent, { prop1: 'toto', $scope }), $element[0]);
  });
```

If none of those solutions work, you will need to manually add the Angular scope in a parent element of your React code.
You can wrap a directive linking function into a call to `ensureScopeAvailable()` to do so:

```js
import { ensureScopeAvailable } from 'react-angular';

angular.module('my-module', [])
  .directive('myDirective', () => ({
    ...someDirectiveDefinition,
    link: ensureScopeAvailable(function ($scope, $element, $attrs) {
       // Do some stuff with your directive 
    }),
  }))
  // -- OR use it standalone:
  .directive('exposeScope', () => ensureScopeAvailable())
;
```

The `AngularTemplate` directive will complain in development that you should be careful.
When you have made sure you _are_ indeed careful,
you can suppress this warning by adding the following snippet in your Angular module:

```js
angular.module('app', [reactAngularModule(false).name])
  .run((reactAngularProductionReady) => reactAngularProductionReady())
  ;
```

## Basic Props

### className: `String`
The class to apply to the wrapper `div`.

This allows you to control how the wrapper (and the directive inside it) is displayed in your page.

This class will be added to the child JSX element if you're using JSX templates,
in addition to any class defined on the child itself.

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
import AngularTemplate from 'react-angular';

import controler from './controller';

export default function MyComponent(props) {
  return <AngularTemplate
    template="<div ng-class='{ active: doc.hasClass }'></div>"
    controller={controller}
    controllerAs="doc"
    inject={{
      someClass: 'document-active',
    }}
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
import AngularTemplate from 'react-angular';

export default function MyComponent(props) {
  return <AngularTemplate
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

If both `template` and `templateUrl` are specified, `template` will be used.

You should not use `template` when using JSX children.
If you choose to do it anyway, the template will be included _after_ the children.

### templateUrl: `String`
Use a template from Angular's template cache.
This allows you to use a template loader or template scripts as the template source.

If both `template` and `templateUrl` are specified, `template` will be used.

You should not use `templateUrl` when using JSX children.
If you choose to do it anyway, the template will be included _after_ the children.

### wrapperTag: `String`
The wrapper tag to use. By default it is a `div`.

You can change it to a `span` or anything else,
even an element directive (see Advanced Usage below).

`wrapperTag` is completely ignored when using JSX children.

### wrapperAttrs: `Object`
Attributes to apply to the wrapper element.

These will be passed as in JSX, e.g. all non-standard attributes have to be prefixed with `data-`.
No transformation will be applied to the attributes, so they have to be passed as in HTML
(e.g. pass `data-ng-bind`, not 'ngBind').
On a custom component wrapper, no transformation is applied (see Rendering JSX Children above).

`wrapperAttrs` are applied to the root JSX child when using JSX children rendering.

## Known Caveats and Limitations

### Property flow
Since AngularJS and React have a different approach to updating the DOM,
property updates will _not_ be propagated to the managed scope or controller.

You should *never* count on Angular updating a property passed to `AngularTemplate`,
although `AngularTemplate` does not do anything to prevent it.

If you want to watch scope changes, you should reference the `AngularTemplate` instance and add watchers to the scope
(see Advanced Usage below).

### Using `require()`
Since the library is written in ES6 and transpiled with Babel,
when using `require()` instead of `import` to import it,
you must explicitly ask for the default export:
```js
var AngularTemplate = require('react-angular').default;
```

## Advanced Usage

### Wrapper element
By manipulating the wrapper tag (`wrapperTag` and `wrapperAttrs` props),
you can declare attribute directives directly on the wrapper element (e.g. `data-ng-bind`),
or even insert an element directive directly as the wrapper tag.

### API
By referencing the `AngularTemplate` component,
you can get access to several component attributes that allow you to manipulate the created AngularJS structure:

- `$scope`: This is the scope used to compile the wrapper tag and the template.
  You can use this to add watchers or event handlers, or to send events.
- `$element`: This is the wrapper element as a JQLite element.
  You can use this to further manipulate or query the DOM.
  When using directives that mutate the root element,
  `$element` may not represent the actual content of the DOM since it could have been replaced, changed,
  duplicated or removed from the DOM.
  The API makes no attempt at keeping `$element` up-to-date with extreme and borderline manipulations.

Example:
```js
import React from 'react';
import AngularTemplate from 'react-angular';

export default class MyComponent {
  componentDidMount() {
    this.reactAngular.$scope.$watch(
      'someValue',
       (newValue) => console.log(newValue)
     );
  }

  render() {
    return <AngularTemplate
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

To run a continuous build:
```sh
npm run build:watch
```

To run continuous testing:
```sh
npm run test:watch
```

## Authors and license
This library is licenced under the MIT licence (see LICENCE file).

Authors:
- Fabien Mauquié

## Changelog


v0.3.1
- Fix usage without `ngReact`
- Fix exposing HOC and directive link decorator

v0.3.0
- Allow running with `$compileProvider.debugInfoEnabled(false);` with `ngReact`, a HOC, or a custom directive
- Document production mode
- Use `prop-types` package

v0.2.0
- Change directive name to `AngularTemplate` (better readability)
- JSX children rendering

v0.1.0
- Initial version
- ReactAngular component
- Template rendering
