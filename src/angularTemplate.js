import React, { Component } from 'react';
import t from 'prop-types';
import angular from 'angular';

// Stolen from ReactCOMComponent (it does not expose it)
function isCustomComponent(tagName, props) {
  return tagName.indexOf('-') >= 0 || props.is != null;
}

// Make sure the scope is defined when $compileProvider.debugInfoEnabled is false
export function ensureScopeAvailable(link) {
  return function ($scope, $element, ...args) {
    link && link($scope, $element, ...args);
    $element.data('$scope', $scope);
  };
}

let debugInfoEnabled = null;

export function reactAngularModule(usesNgReact = true) {
  const raModule = angular.module('react-angular', usesNgReact ? ['react'] : [])
    .config([
      '$compileProvider', ($compileProvider) => {
        debugInfoEnabled = $compileProvider.debugInfoEnabled.bind($compileProvider);
      },
    ])
    .value('reactAngularProductionReady', () => debugInfoEnabled = () => false);

  if (usesNgReact) {
    raModule
      .directive('reactComponent', () => ($scope, $elem) => {
        $elem.data('$scope', $scope)
      })
      .decorator('reactDirective', [
        '$delegate', ($delegate) => (...args) => {
          const directive = $delegate(...args);

          return {
            ...directive,
            link: ensureScopeAvailable(directive.link),
          };
        }
      ])
      .run(['reactAngularProductionReady', (reactAngularProductionReady) => reactAngularProductionReady()]);
  }

  return raModule;
}

export default class ReactAngular extends React.Component {
  componentDidMount() {
    const { controller, controllerAs, inject, isolate, scope, template, templateUrl } = this.props;

    if (!this.context.$scope && !debugInfoEnabled) {
      console.warn(
        '[react-angular] It looks like you have not added the react-angular module to your dependencies.',
        `Check react-angular documentation, section 'Running in production'.`
      );
    }
    if (!this.context.$scope && debugInfoEnabled && debugInfoEnabled()) {
      console.warn(
        '[react-angular] It looks like you have declared that you are not using ngReact.',
        'You should use either provideAngularScopeHOC(), or ensureScopeAvailable().',
        `If you are using ensureScopeAvailable() and you don't want to see this warning again, call the reactAngularProductionReady() service in your module's init() block.`,
        `Check react-angular documentation, section 'Running in production'.`
      );
    }

    const parentScope = this.context.$scope || this.$element.scope();
    const $injector = this.$element.injector();

    const $controller = $injector.get('$controller');
    const $compile = $injector.get('$compile');
    const $rootScope = $injector.get('$rootScope');
    const $templateCache = $injector.get('$templateCache');

    this.$scope = scope ? parentScope.$new(isolate) : parentScope;

    if (angular.isObject(scope)) {
      angular.extend(this.$scope, scope);
    }

    const actualTemplateFunc = template || (templateUrl ? $templateCache.get(templateUrl) : null);

    const actualTemplate = angular.isFunction(actualTemplateFunc)
      ? actualTemplateFunc(inject)
      : actualTemplateFunc;

    if (controller) {
      const instantiatedController = $controller(controller, {
        ...inject,
        $scope: this.$scope,
        $element: this.$element,
      });

      if (controllerAs) {
        this.$scope[controllerAs] = instantiatedController;
      }
    }

    if (actualTemplate) {
      this.$element.append(actualTemplate);
    }

    $compile(this.$element)(this.$scope);
    this.$element.data('$scope', this.$scope);
    $rootScope.$evalAsync();
  }

  shouldComponentUpdate() {
    return false;
  }
  
  /**
   * Remove React components mounted to angular template
   */
  componentWillUnmount() {
    this.$element.find('react-component').each(function () { // keep function because this is current element
      ReactDOM.unmountComponentAtNode(this);
    });
  }

  render() {
    const { wrapperTag, className, wrapperAttrs, children } = this.props;
    const ref = (element) => this.$element = angular.element(element);

    if (children) {
      if (!React.isValidElement(children)) {
        throw new Error(`Only one child is allowed in AngularTemplate.
          Found ${children.length}: ${children.map(({ type }) => type).join(', ')}.`);
      }

      const classesKey = isCustomComponent(children.type, children.props) ? 'class' : 'className';
      const classes = {
        [classesKey]: [className || '', children.props.className || '', children.props['class'] || '']
          .join(' ')
          .trim() || undefined,
      };

      const child = React.cloneElement(children, {
        ...wrapperAttrs,
        ref,
        ...classes,
      });

      return child;
    }

    const classesKey = isCustomComponent(wrapperTag, wrapperAttrs) ? 'class' : 'className';
    const classes = {
      [classesKey]: [className || '', wrapperAttrs.className || '', wrapperAttrs['class'] || '']
        .join(' ')
        .trim() || undefined,
    };

    return React.createElement(wrapperTag, {
      ...wrapperAttrs,
      ref,
      ...classes,
    }, '');
  }
}

ReactAngular.propTypes = {
  className: t.string,
  children: t.node,
  controller: t.any,
  controllerAs: t.string,
  inject: t.object,
  isolate: t.bool,
  scope: t.oneOfType([t.bool, t.object]),
  template: t.oneOfType([t.string, t.func]),
  templateUrl: t.string,
  wrapperTag: t.string,
  wrapperAttrs: t.object,
};

ReactAngular.defaultProps = {
  inject: {},
  isolate: false,
  scope: true,
  wrapperTag: 'div',
  wrapperAttrs: {},
};

const CONTEXT_TYPES = {
  $scope: t.any,
};

ReactAngular.contextTypes = CONTEXT_TYPES;

export function provideAngularScopeHOC(Wrapped) {
  const wrappedName = Wrapped.displayName || Wrapped.name;
  const wrapperName = `ProvideAngularScope (${wrappedName})`;

  class Wrapper extends Component {
    getChildContext() {
      return {
        $scope: this.props.$scope,
      };
    }

    render() {
      const { $scope, ...props } = this.props;

      if (!$scope) {
        throw new Error(`Angular scope was not passed as the $scope prop to ${wrapperName}.`);
      }

      return (
        <Wrapped {...props} />
      );
    }
  }

  Wrapper.childContextTypes = CONTEXT_TYPES;
  Wrapper.propTypes = {
    ...(Wrapped.propTypes || {}),
    ...CONTEXT_TYPES,
  };

  return Wrapper;
}
