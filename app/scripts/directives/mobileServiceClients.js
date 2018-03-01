'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileServiceClients', {
    controller: [
      'NotificationsService',
      'MobileClientsService',
      MobileServiceClients
    ],
    bindings: {
      project: '<',
      serviceInstance: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/directives/mobile-service-clients.html'
  });

  function MobileServiceClients(
                       NotificationsService,
                       MobileClientsService) {
    var ctrl = this;

    ctrl.$doCheck = function() {
      ctrl.filteredClients = MobileClientsService.filterNotExcluded(ctrl.mobileClients, ctrl.serviceInstance);
    };

    ctrl.excludeClient = function(mobileClient) {
      MobileClientsService.excludeClient(mobileClient, ctrl.serviceInstance, {namespace: _.get(ctrl, 'project.metadata.name')})
      .then(function() {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile client ' + _.get(mobileClient, 'spec.name') + ' excluded from ' + _.get(ctrl.serviceInstance, 'metadata.name')
          });
        }).catch(function(err) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to exclude mobile client ' + _.get(mobileClient, 'spec.name'),
            details: error.data.message
          });
        });
    };

    ctrl.closeOverlayPanel = function() {
      _.set(ctrl, 'overlay.panelVisible', false);
    };

    ctrl.showOverlayPanel = function(panelName, state) {
      _.set(ctrl, 'overlay.panelVisible', true);
      _.set(ctrl, 'overlay.panelName', panelName);
      _.set(ctrl, 'overlay.state', state);
    };

    ctrl.canAddMobileClient = function() {
      return !MobileClientsService.filterExcluded(_.get(ctrl.serviceInstance, 'metadata.name'),
                                                   ctrl.mobileClients).length;
    };
  }
})();
