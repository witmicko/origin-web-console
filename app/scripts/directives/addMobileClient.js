'use strict';

(function() {
  angular.module('openshiftConsole').component('addMobileClient', {
    controller: [
      'DataService',
      'NotificationsService',
      'MobileClientsService',
      AddMobileClient
    ],
    controllerAs: 'ctrl',
    bindings: {
      onClose: '<',
      project: '<',
      serviceName: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/directives/add-mobile-client.html'
  });

  function AddMobileClient(
                       DataService,
                       NotificationsService,
                       MobileClientsService) {
    var ctrl = this;
    ctrl.context = {namespace: ctrl.project.metadata.name};

    ctrl.$onInit = function() {
      ctrl.clientsWhereExcluded = MobileClientsService.filterExcluded(ctrl.serviceName, ctrl.mobileClients);
    };


    ctrl.addMobileClient = function(mobileClient) {
      MobileClientsService.removeFromExcluded(mobileClient, ctrl.serviceName, ctrl.context)
        .then(function() {
          NotificationsService.addNotification({
            type: "success",
            message: "Successfully added " + mobileClient.metadata.name + " client."
          });
        })
        .catch(function(error) {
          NotificationsService.addNotification({
            type: "error",
            message: "Failed to add mobile client",
            details: error.data.message
          });
        });

      ctrl.onClose();
    };

  }
})();
