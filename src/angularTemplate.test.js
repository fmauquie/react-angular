import angular from 'angular';
import 'angular-mocks';
import { expect } from 'chai';
import ngReact from 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';
import t from 'prop-types';

import AngularTemplate, { provideAngularScopeHOC } from './angularTemplate';

angular.module('testAngularTemplate', [ngReact.name])
  .config(($compileProvider) => $compileProvider.debugInfoEnabled(false))
  .value('Component', null)
  .decorator('Component', ($delegate) => angular.module('testAngularTemplate').Component)
  .directive('plop', () => ({
    restrict: 'E',
    template: '<div class="plop"></div>',
  }))
  .directive('simpleTemplateDirective', () => ({
    restrict: 'E',
    template: '<div class="simple"></div>',
  }))
  .directive('transcludeDirective', () => ({
    restrict: 'E',
    transclude: true,
    template: '<div class="transclude"><div class="one">plop</div><div class="two" ng-transclude></div></div>',
  }))
  .directive('replaceDirective', () => ({
    restrict: 'E',
    replace: true,
    template: '<div class="replace"></div>',
  }))
  .directive('ngReactDirective', (reactDirective) => {
    const SomeReact = (props) => (
      <div>
        <span className="toto">{props.toto}</span>
        {props.component()}
      </div>
    );
    SomeReact.propTypes = { toto: t.string, component: t.func, };

    return reactDirective(SomeReact);
  })
  .directive('manualReact', () => ({
    restrict: 'E',
    scope: {
      props: '&',
    },
    link: ($scope, $element) => {
      ReactDOM.render(React.createElement(angular.module('testAngularTemplate').Component, {
        ...$scope.props(),
        $scope,
      }), $element[0]);
    }
  }))
;

describe('AngularTemplate', () => {
  let $compile;
  let $rootScope;
  let $container;

  beforeEach(angular.mock.module('testAngularTemplate'));
  beforeEach(angular.mock.inject(($injector, $document) => {
    $container = angular.element('<div></div>');
    $container.data('$injector', $injector);
    $document.append($container);
  }));
  beforeEach(angular.mock.inject((_$compile_, _$rootScope_) => {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));
  afterEach(() => {
    $container.remove();
  });

  const compile = (Component, props = {}) => {
    angular.module('testAngularTemplate').Component = Component;
    $rootScope.props = props;

    const element = $compile('<react-component name="Component" props="props"></react-component>')($rootScope, (clone) => {
      $container.append(clone);
    });
    $rootScope.$digest();

    return element.children();
  };

  it('works with simple HTML', () => {
    const element = compile(() => <AngularTemplate template="<h1>plop</h1>"/>);

    expect(element.find('h1').html()).to.equal('plop');
  });

  it('works with an interpolation', () => {
    const element = compile(() => <AngularTemplate template="<h1>{{1+1}}</h1>"/>);

    expect(element.find('h1').html()).to.equal('2');
  });

  it('injects values in the function template', () => {
    const template = ({ value }) => value;
    const element = compile(() => <AngularTemplate template={template} inject={{ value: 'plop' }}/>);

    expect(element.html()).to.equal('plop');
  });

  it('applies the class to the wrapper', () => {
    const element = compile(() => <AngularTemplate className="plop"/>);

    expect(element.hasClass('plop')).to.be.true;
  });

  it('wraps with a div by default', () => {
    const element = compile(() => <AngularTemplate/>);

    expect(element.prop('tagName')).to.equal('DIV');
  });

  it('applies the requested wrapper tag', () => {
    const element = compile(() => <AngularTemplate wrapperTag="span"/>);

    expect(element.prop('tagName')).to.equal('SPAN');
  });

  it('applies the requested wrapper directive', () => {
    const element = compile(() => <AngularTemplate wrapperTag="simple-template-directive"/>);

    expect(element.prop('tagName')).to.equal('SIMPLE-TEMPLATE-DIRECTIVE');
    expect(element.children().hasClass('simple')).to.be.true;
  });

  it('can embed simple directives as JSX with className', () => {
    const element = compile(() => <AngularTemplate className="plop">
      <plop className="pof"/>
    </AngularTemplate>);

    expect(element.prop('tagName')).to.equal('PLOP');
    expect(element.hasClass('plop')).to.be.true;
    expect(element.hasClass('pof')).to.be.true;
    expect(element.children().hasClass('plop')).to.be.true;
  });

  it('can embed component directives as JSX with className', () => {
    const element = compile(() => <AngularTemplate className="plop">
      <simple-template-directive class="pof" ng-bind="'pof'"/>
    </AngularTemplate>);

    expect(element.prop('tagName')).to.equal('SIMPLE-TEMPLATE-DIRECTIVE');
    expect(element.hasClass('plop')).to.be.true;
    expect(element.hasClass('pof')).to.be.true;
    // ng-bind removes the actual directive content from the element
    expect(element.html()).to.equal('pof');
  });

  it('works with transcluding directives', () => {
    const element = compile(() => <AngularTemplate>
      <transclude-directive>
        <plop/>
      </transclude-directive>
    </AngularTemplate>);

    expect(element.prop('tagName')).to.equal('TRANSCLUDE-DIRECTIVE');
    expect(element.children().hasClass('transclude')).to.be.true;
    expect(element.children().children().eq(0).hasClass('one')).to.be.true;
    expect(element.children().children().eq(1).hasClass('two')).to.be.true;
    expect(element.children().children().eq(1).children().prop('tagName')).to.equal('PLOP');
    expect(element.children().children().eq(1).children().children().hasClass('plop')).to.be.true;
  });

  it('does not fail on mutation', () => {
    const element = compile(() => <AngularTemplate>
      <replace-directive/>
    </AngularTemplate>);

    expect(element.prop('tagName')).to.equal('DIV');
    expect(element.hasClass('replace')).to.be.true;
  });

  it('does not fail on repeat', () => {
    const element = compile(() => <AngularTemplate>
      <div data-ng-repeat="val in ['a', 'b']" data-ng-class="val"/>
    </AngularTemplate>);

    expect(element.prop('tagName')).to.equal('DIV');
    expect(element.length).to.equal(2);
    expect(element.eq(0).hasClass('a')).to.be.true;
    expect(element.eq(1).hasClass('b')).to.be.true;
  });

  it('does not fail on ngIf', () => {
    const element = compile(() => <AngularTemplate>
      <div data-ng-if="false"/>
    </AngularTemplate>);

    expect(element.length).to.equal(0);
  });

  it('does not crash on props update', () => {
    const Component = (props) => <AngularTemplate className="plop">
      <plop data-ng-class="props.plop"/>
    </AngularTemplate>;
    Component.propTypes = {
      plop: t.string,
    };
    const props = {
      plop: 'plop',
    };
    const element = compile(Component, props);

    expect(element.prop('tagName')).to.equal('PLOP');
    expect(element.hasClass('plop')).to.be.true;
    expect(element.hasClass('pof')).to.be.false;

    props.plop = 'pof';
    $rootScope.$apply();

    expect(element.hasClass('plop')).to.be.false;
    expect(element.hasClass('pof')).to.be.true;
  });

  it('creates a new scope by default', () => {
    const element = compile(() => <AngularTemplate/>);

    const scope = element.scope();
    expect(scope.$parent).to.equal($rootScope);
    expect(Object.getPrototypeOf(scope)).to.equal($rootScope);
  });

  it('can prevent a new scope from being created', () => {
    const element = compile(() => <AngularTemplate scope={false}/>);

    expect(element.scope()).to.equal($rootScope);
  });

  it('can create an isolate scope', () => {
    const element = compile(() => <AngularTemplate isolate/>);

    const scope = element.scope();
    expect(scope.$parent).to.not.equal(Object.getPrototypeOf(scope));
  });

  it('injects scope variables', () => {
    const element = compile(() => <AngularTemplate scope={{ plop: 'pof' }} template="{{plop}}"/>);

    expect(element.html()).to.equal('pof');
  });

  it('can use a template URL', angular.mock.inject(($templateCache) => {
    $templateCache.put('plop.html', 'plop');
    const element = compile(() => <AngularTemplate templateUrl="plop.html"/>);

    expect(element.html()).to.equal('plop');
  }));

  it('can specify and inject a controller', () => {
    class Controller {
      constructor($scope, $document, value) {
        expect($document).to.exist;
        $scope.plop = value;
      }
    }
    const element = compile(() => <AngularTemplate
      controller={Controller}
      template="{{plop}}"
      inject={{ value: 'pof' }}
    />);

    expect(element.html()).to.equal('pof');
  });

  it('can specify and inject a controller with controllerAs', () => {
    class Controller {
      constructor($scope, $document, value) {
        expect($document).to.exist;
        this.plop = value;
      }
    }

    const element = compile(() => <AngularTemplate
      controller={Controller}
      controllerAs="ctl"
      template="{{ctl.plop}}"
      inject={{ value: 'pof' }}
    />);

    expect(element.html()).to.equal('pof');
  });

  it('applies attributes to the surrounding tag', () => {
    const element = compile(() => <AngularTemplate
      wrapperAttrs={{
        id: 'plop',
        'data-ng-bind': '"pof"',
        'aria-role': 'menu',
      }}
    />);

    expect(element.html()).to.equal('pof');
    expect(element.attr('id')).to.equal('plop');
    expect(element.attr('aria-role')).to.equal('menu');
  });


  it('exposes the scope in the API', () => {
    const found = {};
    class Component extends React.Component {
      componentDidMount() {
        found.$scope = this.ra.$scope;
        found.$element = this.ra.$element;
      }

      render() {
        return <AngularTemplate ref={(ra) => this.ra = ra}/>;
      }
    }
    compile(Component);

    expect(found.$scope).to.exist;
    expect(found.$scope.$parent).to.equal($rootScope);
    expect(found.$element).to.exist;
    expect(found.$element.prop('tagName')).to.equal('DIV');
  });

  it('passes the scope in ngReact custom directives', () => {
    const found = {};
    const Component = ()  => <AngularTemplate ref={(ra) => found.ra = ra}/>;

    $rootScope.propsToPass = { toto: 'voila' };
    $rootScope.Component = Component;

    const $element = $compile('<ng-react-directive toto="propsToPass.toto" component="Component" />')($rootScope, (clone) => {
      $container.append(clone);
    });
    $rootScope.$digest();

    expect(found.ra.$scope).to.exist;
    expect(found.ra.$scope.$parent).to.equal($rootScope);
    expect($element.find('span').length).to.equal(1);
    expect($element.find('span').attr('class')).to.equal('toto');
    expect($element.find('span').text()).to.equal('voila');
  });

  it('passes the scope in the context', () => {
    const found = {};
    class Component extends React.Component {
      componentDidMount() {
        found.$scope = this.ra.$scope;
      }

      render() {
        return (
          <div>
            <AngularTemplate ref={(ra) => this.ra = ra}/>
            <span className="toto">{this.props.toto}</span>
          </div>
        );
      }
    }
    Component.propTypes = {
      toto: t.string.isRequired,
    };

    const ComponentPassingScope = provideAngularScopeHOC(Component);

    angular.module('testAngularTemplate').Component = ComponentPassingScope;
    $rootScope.propsToPass = { toto: 'voila' };

    const $element = $compile('<manual-react props="propsToPass"></manual-react>')($rootScope, (clone) => {
      $container.append(clone);
    });
    $rootScope.$digest();

    expect(found.$scope).to.exist;
    expect(found.$scope.props).to.exist;
    expect(found.$scope.props()).to.eql({ toto: 'voila' });
    expect($element.find('span').length).to.equal(1);
    expect($element.find('span').attr('class')).to.equal('toto');
    expect($element.find('span').text()).to.equal('voila');
  });
});
