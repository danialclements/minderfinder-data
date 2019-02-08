const request = require('request');
const stringify = require('csv-stringify');
import {writeFileSync, fstat } from 'fs';

interface County {
  CountyID: number;
  Name: string;
  sortOrder?: number;
}

interface ServiceType {
  Service_Type_ID: number;
  Service_Type: string
}

interface Address {
  AddressID: number;
  Address1: string;
  Address2: string;
  Address3: string;
  Town: string;
  Eircode: string;
}

interface Age {
  AgeID: number;
  Age_Range: string;
}

interface Facility {
  Address: Address;
  Ref_No: string;
  Area: string;
  Community: string;
  Contact_Name: string;
  AddressID: number;
  Email: string;
  Phone_Number: string;
}

interface RegisteredStatus {
  Registered_Status_ID: number;
  Registered_Status_Type: string;
  Registered_Status_Info: string;
}

interface Service {
  Address: Address;
  Age: Age;
  County: County;
  Facility: Facility;
  Registered_Status: RegisteredStatus;
  Service_Types: ServiceType;
  ServiceID: number;
  CountyID: number;
  Service_Type_ID: number;
  Facility_Name: string;
  Contact_Name: string;
  AddressID: number;
  Ref_No: string;
  Conditions: string;
  AgeID: number;
  Registered_Status_ID: number;
  Registration_Date: string;
}

interface ServiceResponse {
  Data: Service[],
  Total: number,
  AggregateResults: any;
  Errors: any
};


function getCounties(): Promise<County[]> {
  return new Promise((resolve, reject) => {
    request.get('https://test-earlyyears-wa.azurewebsites.net/Home/Get_County', (err, response, body) => {
      if (err) {
        return reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function getServiceTypes(): Promise<ServiceType[]> {
  return new Promise((resolve, reject) => {
    request.get('https://test-earlyyears-wa.azurewebsites.net/Home/Get_Service', (err, response, body) => {
      if (err) {
        return reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function getFacilitiesByCountyAndService(countyId: number, serviceId: number): Promise<ServiceResponse> {
  const form = {
    sort: 'Facility_Name-asc',
    page: 1,
    group: null,
    filter: null
  };

  return new Promise((resolve, reject) => {
    const url = `https://test-earlyyears-wa.azurewebsites.net/Display/Get_Service/${countyId}/${serviceId}`;
    request.post(url, { form }, (err, response, body) => {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function getReportForService(refNo: string): Promise<any> {
  const form = {
    sort: null,
    group: null,
    filter: null
  };
  
  return new Promise((resolve, reject) => {
    const url = `https://test-earlyyears-wa.azurewebsites.net/Display/Get_Report?Ref_No=${refNo}`;
    request.post(url, { form,  }, (err, response, body) => {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<any>) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const data = [];

const stringifier = stringify({
  delimiter: ',',
  header: true,
  columns: [
    {key: 'boo', header: 'Ref_No' },
    {key: 'boo', header: 'Facility_Name' },
    {key: 'boo', header: 'Service_Type' },
    {key: 'boo', header: 'Contact_Name' },
    {key: 'boo', header: 'Address1' },
    {key: 'boo', header: 'Address2' },
    {key: 'boo', header: 'Address3' },
    {key: 'boo', header: 'Town' },
    {key: 'boo', header: 'Eircode' },
    {key: 'boo', header: 'County' },
    {key: 'boo', header: 'Age_Range' },
    {key: 'boo', header: 'Area' },
    {key: 'boo', header: 'Community' },
    {key: 'boo', header: 'Contact_Name' },
    {key: 'boo', header: 'Email' },
    {key: 'boo', header: 'Phone_Number' },
  ]
})
stringifier.on('readable', function(){
  let row;
  while(row = stringifier.read()){
    data.push(row)
  }
})
stringifier.on('error', function(err){
  console.error(err.message)
})
stringifier.on('finish', function(){
  writeFileSync('services.csv', data.join(''), )
})


Promise.all([getCounties(), getServiceTypes()])
  .then(async results => {
    const counties = results[0];
    const serviceTypes = results[1];

    await asyncForEach(counties, async (county) => {
      await asyncForEach(serviceTypes, async (serviceType) => {
        console.log(`Getting service type '${serviceType.Service_Type}' for '${county.Name}'`)
        const response = await getFacilitiesByCountyAndService(county.CountyID, serviceType.Service_Type_ID);
        const services = response.Data;
        services.forEach(service => {
          stringifier.write([
            service.Ref_No,
            service.Facility_Name,
            service.Service_Types.Service_Type,
            service.Contact_Name,
            service.Address.Address1,
            service.Address.Address2,
            service.Address.Address3,
            service.Address.Town,
            service.Address.Eircode,
            service.County.Name,
            service.Age.Age_Range,
            service.Facility.Area,
            service.Facility.Community,
            service.Facility.Contact_Name,
            service.Facility.Email,
            service.Facility.Phone_Number
          ])
        });
        
      });
    });

    stringifier.end()
  });