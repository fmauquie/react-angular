import React, { PropTypes as t } from 'react';
import angular from 'angular';

export default class ReactAngular extends React.Component {
  componentDidMount() {
    const { controller, controllerAs, inject, isolate, scope, template, templateUrl } = this.props;

    if (!template && !templateUrl) {
      throw new Error('ReactAngular needs a template or a templateUrl');
    }

    const $element = angular.element(this.$element);
    const parentScope = $element.scope();
    const $injector = $element.injector();

    const $controller = $injector.get('$controller');
    const $compile = $injector.get('$compile');
    const $rootScope = $injector.get('$rootScope');
    const $templateCache = $injector.get('$templateCache');

    const $scope = scope ? parentScope.$new(isolate) : parentScope;

    if (angular.isObject(scope)) {
      angular.extend($scope, scope);
    }

    const actualTemplateFunc = template || (templateUrl ? $templateCache.get(templateUrl) : null);

    const actualTemplate = angular.isFunction(actualTemplateFunc)
      ? actualTemplateFunc(inject)
      : actualTemplateFunc;

    if (controller) {
      const instantiatedController = $controller(controller, {
        ...inject,
        $scope,
        $element,
      });

      if (controllerAs) {
        $scope[controllerAs] = instantiatedController;
      }
    }

    $element.append(actualTemplate);
    $compile($element)($scope);
    $rootScope.$applyAsync();
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { wrapperTag, className, wrapperAttrs } = this.props;

    return React.createElement(wrapperTag, {
      ...wrapperAttrs,
      ref: (element) => this.$element = element,
      className,
    }, '');
  }
}

ReactAngular.propTypes = {
  className: t.string,
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
