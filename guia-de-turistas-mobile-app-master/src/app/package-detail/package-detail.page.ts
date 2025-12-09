import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  LoadingController,
  AlertController,
  NavController,
  IonContent,
} from "@ionic/angular";
import { Package } from "./../../interfaces/package";
import { Purchase } from "../../interfaces/purchase";
import { PackageService } from "./../services/package.service";
import { LoadingService } from "./../services/loading.service";
import { AuthService } from "./../services/auth.service";
import { Subscription } from "rxjs";
import { Preferences } from '@capacitor/preferences';
import { DomSanitizer } from "@angular/platform-browser";
import { PickerController } from "@ionic/angular";
import { User } from "firebase";
import { CalendarService } from "../services/calendar.service";
import { CalendarResult, CalendarModalOptions } from "ion2-calendar";


@Component({
  selector: "app-package-detail",
  templateUrl: "./package-detail.page.html",
  styleUrls: ["./package-detail.page.scss"],
})
export class PackageDetailPage implements OnInit {
  @ViewChild("content") public content: any;
  @ViewChild("segmentsRow") public segmentsRow: HTMLElement;

  notStarted = true;
  selectedPackage: Package = {}; //Package loaded from storage memory
  package: Package = {}; //Package loaded with subscription listening for changes
  selectedPackageSubscription: Subscription;
  sanitizedUrl: any;
  loading: any;
  segment = "purchase"; //segment which change betweeen 'purchase' and 'galery'
  images = []; //Images to display in galery
  today = "";
  maxDate = "";
  available: number; //available number of packets fo specific date
  defaultColumnOptions = [[]]; //quantity of packets picker list
  numberOfPacketsSelected = 1;
  selectedDate: string;
  user: User;
  dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
];
  displayPackageSchedule = 'Horario abierto'
  slideOpts = {};

  constructor(
    private packageService: PackageService,
    public authService: AuthService,
    private loadingService: LoadingService,
    public loadingController: LoadingController,
    public alertController: AlertController,
    public navController: NavController,
    public sanitizer: DomSanitizer,
    public pickerController: PickerController,
    private calendarService: CalendarService
  ) {

    this.slideOpts = {
      slidesPerView: 1.5,
      spaceBetween: 5,
      speed: 400,
      loop: true,
      centeredSlides: true,
      autoplay: {
        delay: 2000
      },
  }
  }

  async ngOnInit() {
   

    //Get Package from memory
    const storePackageResult = await Preferences.get({ key: "selectedPackage" });
    this.selectedPackage = JSON.parse(storePackageResult.value);

    if (this.selectedPackage === null) {
      //Return to panel if there is noselected package
      this.packageService.resetPackage();
      return await this.navController.navigateRoot(["/panel"]);
    }
    // Check if already filtered in specific date
    this.selectedDate = (await Preferences.get({ key: "dateFilter" })).value as string;
    if(!!this.selectedDate){
      const loading = await this.loadingService.loading();
      try {
      await loading.present();
      setTimeout(() => {
        this.calculateDate(this.selectedDate);
      }, 1000);
        await this.loadingService.removeLoading(loading);
      } catch (error) {
        await this.loadingService.removeLoading(loading);
        console.log(error)
      }
     
    }
    //Get Package images from memory
    if (!!this.selectedPackage.images) {
      this.images = this.selectedPackage.images;
    }
    //subscrite to changes in data
    if (Object.keys(this.selectedPackage).length) {
      this.selectedPackageSubscription = this.packageService.$selectedPackage.subscribe(
        (p) => {
          this.package = p;
          this.notStarted = false;
          if (!Object.keys(p).length) {
            return this.packageService.setPackage(this.selectedPackage.id);
          }
        }
      );
      //Todays Date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.today = today.toISOString().slice(0, 10);
      let max: Date;
      if (today.getMonth() === 11) {
        max = new Date(today.setMonth(0));
      } else {
        max = new Date(today.setMonth(today.getMonth() + 1));
      }
      this.maxDate = max.toISOString().slice(0, 10);
    } else {
      //Return to panel if there is noselected package
      this.packageService.resetPackage();
      return await this.navController.navigateRoot(["/panel"]);
    }

    switch (this.selectedPackage.schedule) {
      case 'Brunch':
        console.log(this.selectedPackage.schedule)

        this.displayPackageSchedule = 'Brunch 7:00am - 1pm';
        
        break;
      case 'Comida':
        console.log(this.selectedPackage.schedule)

        this.displayPackageSchedule = 'Comida 1pm - 7pm';

        break;
      case 'Cena':
        console.log(this.selectedPackage.schedule)

        this.displayPackageSchedule = 'Cena 7pm a cierre de cocina';

        break; 

      default:
        console.log(this.selectedPackage.schedule)

        break;
    }

   
  }

  scrolling(event){
    const segmentsRow = document.querySelector('#segmentsRow');
    // console.log(document.querySelector('#header').clientHeight, '  lol ' ,segmentsRow.getBoundingClientRect().top);

    if(document.querySelector('#header').clientHeight >= segmentsRow.getBoundingClientRect().top){
      segmentsRow.setAttribute("style", `background-color: white; position: fixed; width: 100%; top: ${document.querySelector('#header').clientHeight }px; z-index: 10;`)
    } 


    const currentScrollDepth = event.detail.scrollTop;
    // console.log({currentScrollDepth});

    if(currentScrollDepth < 150) {
      segmentsRow.setAttribute("style", `background-color: white; position: relative;`)
    }
  
  }

  async ionViewDidEnter() {
    //Charge video if there is an url
    if (!!this.selectedPackage.videoUrl) {
      const url = this.selectedPackage.videoUrl.replace("watch?v=", "embed/");
      this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.loading = await this.loadingService.loading();
      await this.loading.present();
    }
  }

  //Stop charging spinner when video is loaded
  async handleIFrameLoadEvent() {
    if (this.loading) {
      await this.loadingService.removeLoading(this.loading);
    }
  }

  //Changing segment
  segmentChanged(event: any) {
    this.segment = event.detail.value;
  }

  //Set how many avalable packages there are
  calculateDate(date: string){
    console.log('Date calculated',date)
    this.selectedDate = date;
    this.available = this.calculateAvailable(this.selectedDate);
    this.numberOfPacketsSelected = 1;
    //Push numbers to list for number of packets selection
    for (let index = 0; index < this.available; index++) {
      this.defaultColumnOptions[0].push(index + 1);
      if(index === 2) break;
    }
  }

  // Open calendar and select date
  async openCalendar() {
    let options: CalendarModalOptions;
    if(!this.selectedDate){
      options = {
        from: new Date(),
        to: new Date("2025/12/31 18:10:45"),
         title: 'Revisar disponiblidad',
         weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
         color: 'white',
        
       };
     } else{
       options = {
        from: new Date(),
        to: new Date("2025/12/31 18:10:45"),
         title: 'Revisar disponiblidad',
         weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
         color: 'white',
         defaultDate: this.selectedDate
       }; 
     }
    const date: CalendarResult = await this.calendarService.openCalendar(
      options
    );
    if (date !== null) {
      const loading = await this.loadingService.loading();
      try {
      await loading.present();
       this.calculateDate(date.string) ;
        setTimeout(() => {
          this.content.scrollToBottom(1500);
        }, 500);
        await this.loadingService.removeLoading(loading);
      } catch (error) {
        await this.loadingService.removeLoading(loading);
        console.log(error)
      }
    }
  }
  //Functions to show number of packages for specific date
  //START
  async openPicker(
    numColumns = 1,
    numOptions = this.defaultColumnOptions[0].length,
    columnOptions = this.defaultColumnOptions
  ) {
    const picker = await this.pickerController.create({
      columns: this.getColumns(numColumns, numOptions, columnOptions),
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
        },
        {
          text: "Seleccionar",
          handler: (value) => {
            this.numberOfPacketsSelected = value.selection.text;
            return true;
          },
        },
      ],
    });
    await picker.present();
  }

  getColumns(numColumns, numOptions, columnOptions) {
    let columns = [];
    for (let i = 0; i < numColumns; i++) {
      columns.push({
        name: `selection`,
        options: this.getColumnOptions(i, numOptions, columnOptions),
      });
    }

    return columns;
  }

  getColumnOptions(columnIndex, numOptions, columnOptions) {
    let options = [];
    for (let i = 0; i < numOptions; i++) {
      options.push({
        text: columnOptions[columnIndex][i % numOptions],
        value: i,
      });
    }

    return options;
  }

  //Calculate total of remaining packets recieving date in string format YYYY-MM-DD
  calculateAvailable(date: string): number {

    console.log(this.package, "Checando paqueteee");

    //Check if that day of the week is available
    const formatedDate = new Date(Number(date.split('-')[0]), Number(date.split('-')[1])-1, Number(date.split('-')[2]) );

    if( !this.package.weekDaysAvailable[this.dayNames[formatedDate.getDay()]]) return 0; //If that week day is false (not available) return 0 available
    

    if (this.package.purchases && this.package.purchases.length > 0) {
      let count = 0; //counter which will substract the total per day
      for (let index = 0; index < this.package.purchases.length; index++) {
        if (date === this.package.purchases[index].reservationDate) {
          count = this.package.purchases[index].quantity + count;
        }
      }
      this.available = this.package.totalPerDay - count;
      return this.available;
    } else {
      return this.package.totalPerDay;
    }
  }
  //Functions to show number of packages in picker for specific date
  //END

  async purchase() {   

    try {
      const now = new Date();
      const purchase: Purchase = {
        packageId: this.selectedPackage.id,
        restaurantId: this.selectedPackage.restaurantId,
        sponsorId: this.selectedPackage.sponsorId,
        purchaseDate: now,
        reservationDate: this.selectedDate,
        quantity: this.numberOfPacketsSelected,
        price: this.numberOfPacketsSelected * this.selectedPackage.price,
        imageUrl: this.selectedPackage.imageUrl,
        pakageName: this.selectedPackage.name,
        validated: false,
        paid: false,
      };
      await Preferences.set({ key: "purchase" , value: JSON.stringify(purchase)});
      await Preferences.set({ key: "selectedPackage" , value: JSON.stringify(this.selectedPackage)});

      return await this.navController.navigateForward("/stripe-card", {
        animationDirection: "forward",
      });
      

    } catch (error) {
      console.log(error);
    }
  }
}
