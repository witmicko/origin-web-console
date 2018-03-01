'use strict';

(function() {
  angular.module('openshiftConsole').component('serviceInstanceRow', {
    controller: [
      '$filter',
      'APIService',
      'AuthorizationService',
      'BindingService',
      'DataService',
      'ListRowUtils',
      'MobileClientsService',
      'NotificationsService',
      'ServiceInstancesService',
      ServiceInstanceRow
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      state: '<',
      bindings: '<',
      mobileClients: '<'
    },
    templateUrl: 'views/overview/_service-instance-row.html'
  });

  function ServiceInstanceRow($filter,
                              APIService,
                              AuthorizationService,
                              BindingService,
                              DataService,
                              ListRowUtils,
                              MobileClientsService,
                              NotificationsService,
                              ServiceInstancesService) {
    var row = this;
    var isBindingFailed = $filter('isBindingFailed');
    var isBindingReady = $filter('isBindingReady');
    var serviceInstanceFailedMessage = $filter('serviceInstanceFailedMessage');
    var truncate = $filter('truncate');

    _.extend(row, ListRowUtils.ui);

    var serviceInstanceDisplayName = $filter('serviceInstanceDisplayName');

    row.serviceBindingsVersion = APIService.getPreferredVersion('servicebindings');
    row.serviceInstancesVersion = APIService.getPreferredVersion('serviceinstances');
    row.isMobileService = _.get(row.apiObject, 'metadata.labels', {}).mobile === 'enabled';

    var getServiceClass = function() {
      var serviceClassName = ServiceInstancesService.getServiceClassNameForInstance(row.apiObject);
      return _.get(row, ['state','serviceClasses', serviceClassName]);
    };

    var getServicePlan = function() {
      var servicePlanName = ServiceInstancesService.getServicePlanNameForInstance(row.apiObject);
      return _.get(row, ['state', 'servicePlans', servicePlanName]);
    };

    var updateInstanceStatus = function() {
      if (_.get(row.apiObject, 'metadata.deletionTimestamp')) {
        row.instanceStatus = 'deleted';
      } else if (isBindingFailed(row.apiObject)) {
        row.instanceStatus = 'failed';
      } else if (isBindingReady(row.apiObject)) {
        row.instanceStatus = 'ready';
      } else {
        row.instanceStatus = 'pending';
      }
    };

    var filterExcluded = function(mobileClients, apiObject) {
      var serviceId = _.get(apiObject, 'metadata.name', '');
      return _.filter(mobileClients, function(client) {
        var excludedServices = _.get(client, 'spec.excludedServices', []);
        return !_.includes(excludedServices, serviceId);
      });
    };

    var mobileclientVersion = {
      group: "mobile.k8s.io",
      version: "v1alpha1",
      resource: "mobileclients"
    };

    row.excludeClient = function(mobileClient) {
      var excludedServices = _.get(mobileClient, 'spec.excludedServices') || [];
      excludedServices.push(_.get(row.apiObject, 'metadata.name'));
      _.set(mobileClient, 'spec.excludedServices', excludedServices);
      var context = {namespace: _.get(row, 'state.project.metadata.name')};
      DataService.update(mobileclientVersion, mobileClient.metadata.name, mobileClient, context)
      .then(function() {
          NotificationsService.addNotification({
            type: 'success',
            message: 'Mobile client ' + _.get(mobileClient, 'spec.name') + ' excluded from ' + _.get(row.apiObject, 'metadata.name')
          });
        }).catch(function(err) {
          NotificationsService.addNotification({
            type: 'error',
            message: 'Failed to exclude mobile client ' + _.get(mobileClient, 'spec.name'),
            details: error.data.message
          });
        });
    };

    row.$doCheck = function() {
      updateInstanceStatus();

      row.notifications = ListRowUtils.getNotifications(row.apiObject, row.state);
      row.serviceClass = getServiceClass();
      row.servicePlan = getServicePlan();
      row.displayName = serviceInstanceDisplayName(row.apiObject, row.serviceClass);
      row.isBindable = BindingService.isServiceBindable(row.apiObject, row.serviceClass, row.servicePlan);
      if (row.isMobileService && row.mobileClients) {
        row.filteredClients = filterExcluded(row.mobileClients, row.apiObject);
      }
    };

    row.$onChanges = function(changes) {
      if (changes.bindings) {
        row.deleteableBindings = _.reject(row.bindings, 'metadata.deletionTimestamp');
      }

      if (row.isMobileService && changes.mobileClients) {
        var clientChanges = _.get(changes, 'mobileClients.currentValue', {})
        row.filteredClients = filterExcluded(clientChanges, row.apiObject);
      }
    };

    row.getSecretForBinding = function(binding) {
      return binding && _.get(row, ['state', 'secrets', binding.spec.secretName]);
    };

    row.actionsDropdownVisible = function() {
      // no actions on those marked for deletion
      if (_.get(row.apiObject, 'metadata.deletionTimestamp')) {
        return false;
      }

      // We can create bindings
      if (row.isBindable && AuthorizationService.canI(row.serviceBindingsVersion, 'create')) {
        return true;
      }
      // We can delete bindings
      if (!_.isEmpty(row.deleteableBindings) && AuthorizationService.canI(row.serviceBindingsVersion, 'delete')) {
        return true;
      }
      // We can delete instances
      if (AuthorizationService.canI(row.serviceInstancesVersion, 'delete')) {
        return true;
      }

      return false;
    };

    row.closeOverlayPanel = function() {
      _.set(row, 'overlay.panelVisible', false);
    };

    row.showOverlayPanel = function(panelName, state) {
      _.set(row, 'overlay.panelVisible', true);
      _.set(row, 'overlay.panelName', panelName);
      _.set(row, 'overlay.state', state);
    };

    row.getFailedTooltipText = function() {
      var message = serviceInstanceFailedMessage(row.apiObject);
      if (!message) {
        return '';
      }

      var truncated = truncate(message, 128);
      if (message.length !== truncated.length) {
        truncated += '...';
      }

      return truncated;
    };

    row.deprovision = function() {
      ServiceInstancesService.deprovision(row.apiObject, row.deleteableBindings);
    };

    row.canAddMobileClient = function() {
      return !MobileClientsService.filterExcluded(_.get(row.apiObject, 'metadata.name'),
                                                   row.mobileClients).length;
    };
  }
})();
