'use strict';

angular.module("openshiftConsole")
  .factory("MobileClientsService", function(DataService) {

    var mobileclientVersion = {
      group: "mobile.k8s.io",
      version: "v1alpha1",
      resource: "mobileclients"
    };


    var watch = function(context, callback, opts ) {
      return DataService.watch(mobileclientVersion, context, callback, opts);
    };

    var getMobileClients = function(namespace) {
      return DataService.list(mobileclientVersion, {namespace: namespace})
        .then(function(clients) {
          return clients.by("metadata.name");
        });
    };


    var filterExcluded = function(serviceName, mobileClients) {
      return _.filter(mobileClients, function(client) {
        return _.includes(client.spec.excludedServices, serviceName);
      });
    };

    var filterNotExcluded = function(mobileClients, apiObject) {
      var serviceId = _.get(apiObject, 'metadata.name', '');
      return _.filter(mobileClients, function(client) {
        var excludedServices = _.get(client, 'spec.excludedServices', []);
        return !_.includes(excludedServices, serviceId);
      });
    };

    var removeFromExcluded = function(mobileClient, serviceName, context) {
      _.remove(mobileClient.spec.excludedServices, function(service) {
        return service === serviceName;
      });
      return DataService.update(mobileclientVersion, mobileClient.metadata.name, mobileClient, context);
    };

    var excludeClient = function(mobileClient, serviceInstance, context) {
      var excludedServices = _.get(mobileClient, 'spec.excludedServices') || [];
      excludedServices.push(_.get(serviceInstance, 'metadata.name'));
      _.set(mobileClient, 'spec.excludedServices', excludedServices);
      return DataService.update(mobileclientVersion, mobileClient.metadata.name, mobileClient, context)
    };

    return {
      watch: watch,
      filterExcluded: filterExcluded,
      filterNotExcluded: filterNotExcluded,
      getMobileClients: getMobileClients,
      removeFromExcluded: removeFromExcluded,
      excludeClient: excludeClient
    };
  });


