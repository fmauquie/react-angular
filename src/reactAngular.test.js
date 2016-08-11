import angular from 'angular';
import 'angular-mocks';
import { expect } from 'chai';
import ngReact from 'ngreact';
import React from 'react';

import ReactAngular from './reactAngular';

angular.module('test', [ngReact.name])
  .value('Component', null)
  .decorator('Component', ($delegate) => angular.module('test').Component)
;

describe('ReactAngular', () => {
  let $compile;
  let $rootScope;
  let $container;

  beforeEach(angular.mock.module('test'));
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

  const compile = (Component) => {
    angular.module('test').Component = Component;

    const element = $compile('<react-component name="Component"></react-component>')($rootScope, (clone) => {
      $container.append(clone);
    });
    $rootScope.$digest();

    return element.children();
  };

  it('works with simple HTML', () => {
    const element = compile(() => <ReactAngular template="<h1>plop</h1>"/>);

    expect(element.find('h1').html()).to.equal('plop');
  });

  it('works with an interpolation', () => {
    const element = compile(() => <ReactAngular template="<h1>{{1+1}}</h1>"/>);

    expect(element.find('h1').html()).to.equal('2');
  });

  it('injects values in the function template', () => {
    const template = ({ value }) => value;
    const element = compile(() => <ReactAngular template={template} inject={{ value: 'plop' }}/>);

    expect(element.html()).to.equal('plop');
  });

  it('applies the class to the wrapper', () => {
    const element = compile(() => <ReactAngular className="plop" template="pof"/>);

    expect(element.hasClass('plop')).to.be.true;
  });

  it('wraps with a div by default', () => {
    const element = compile(() => <ReactAngular template="plop"/>);

    expect(element.prop('tagName')).to.equal('DIV');
  });

  it('applies the requested tag', () => {
    const element = compile(() => <ReactAngular tag="span" template="plop"/>);

    expect(element.prop('tagName')).to.equal('SPAN');
  });

  it('creates a new scope by default', () => {
    const element = compile(() => <ReactAngular template="plop"/>);

    const scope = element.scope();
    expect(scope.$parent).to.equal($rootScope);
    expect(Object.getPrototypeOf(scope)).to.equal($rootScope);
  });

  it('can prevent a new scope from being created', () => {
    const element = compile(() => <ReactAngular scope={false} template="plop"/>);

    expect(element.scope()).to.equal($rootScope);
  });

  it('can create an isolate scope', () => {
    const element = compile(() => <ReactAngular isolate template="plop"/>);

    const scope = element.scope();
    expect(scope.$parent).to.not.equal(Object.getPrototypeOf(scope));
  });

  it('injects scope variables', () => {
    const element = compile(() => <ReactAngular scope={{ plop: 'pof' }} template="{{plop}}"/>);

    expect(element.html()).to.equal('pof');
  });

  it('can use a template URL', angular.mock.inject(($templateCache) => {
    $templateCache.put('plop.html', 'plop');
    const element = compile(() => <ReactAngular templateUrl="plop.html"/>);

    expect(element.html()).to.equal('plop');
  }));

  it('can specify and inject a controller', () => {
    class Controller {
      constructor($scope, $document, value) {
        expect($document).to.exist;
        $scope.plop = value;
      }
    }
    const element = compile(() => <ReactAngular
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

    const element = compile(() => <ReactAngular
      controller={Controller}
      controllerAs="ctl"
      template="{{ctl.plop}}"
      inject={{ value: 'pof' }}
    />);

    expect(element.html()).to.equal('pof');
  });

  it('applies attributes to the surrounding tag', () => {
    const element = compile(() => <ReactAngular
      template="plop"
      tagAttrs={{
        id: 'plop',
        'data-ng-bind': '"pof"',
        'aria-role': 'menu',
      }}
    />);

    expect(element.html()).to.equal('pof');
    expect(element.attr('id')).to.equal('plop');
    expect(element.attr('aria-role')).to.equal('menu');
  });
});
