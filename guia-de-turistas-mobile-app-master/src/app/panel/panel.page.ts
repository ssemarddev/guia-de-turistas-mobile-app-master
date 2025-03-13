import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from "@angular/core";
import {
  LoadingController,
  AlertController,
  NavController,
  IonContent,
} from "@ionic/angular";
import {
  CalendarModalOptions,
  CalendarResult
} from 'ion2-calendar';
import { IonInfiniteScroll, ModalController } from "@ionic/angular";
import { Package } from "./../../interfaces/package";
import { PackageService } from "./../services/package.service";
import { LoadingService } from "./../services/loading.service";
import { AuthService } from "./../services/auth.service";
import { CalendarService } from "./../services/calendar.service";
import { Subscription } from "rxjs";
import { ScrollHideConfig } from '../directives/scroll-hide.directive';
import { take } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';

@Component({
  selector: "app-panel",
  templateUrl: "./panel.page.html",
  styleUrls: ["./panel.page.scss"],
})
export class PanelPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  @ViewChild(IonContent, { static: false }) ionContent: IonContent;
  @ViewChild("gridCol", { static: false }) gridCol: ElementRef;

  headerScrollConfig: ScrollHideConfig = { cssProperty: 'margin-top', maxValue: 50 };
  packagesSubscription: Subscription;
  cityFiltersSubscription: Subscription;
  packages: Package[] = [];
  nextIndex = 20;
  citiesFilter = [];
  hoursFilter = [{value: 'Brunch', displayValue: 'Brunch 7:00am - 1pm'}, {value: 'Comida', displayValue: 'Comida 1pm - 7pm'}, {value: 'Cena', displayValue: 'Cena 7pm a cierre de cocina'}, {value: 'Todos los horarios', displayValue: 'Horario Abierto'}];
  selectedHour = 'Todos los horarios';
  selectedCity = "Seleccionar Ciudad";
  term = "";
  //calendar
  dateFilter = "";

  constructor(
    private packageService: PackageService,
    public authService: AuthService,
    private loadingService: LoadingService,
    public loadingController: LoadingController,
    public alertController: AlertController,
    public navController: NavController,
    private calendarService: CalendarService,
    public modalCtrl: ModalController
  ) {}

  async ngOnInit() {

    // Check if user is logged in local memory
    const user = JSON.parse((await Preferences.get({ key: "user" })).value);
    
    if (user) {
      if (user.type === 2){
        console.log('I am twooooooooooooooooooooo')
  
        await this.navController.navigateRoot("/scan", {
          animationDirection: "forward",
        });
        return true;
      }
      if (user.type === 3){
        console.log('I am threeeeeeee')
  
        await this.navController.navigateRoot("/sponsor", {
          animationDirection: "forward",
        });
        return true;
      }
    }
  

    const loading = await this.loadingService.loading();
    await loading.present();
    await Preferences.remove({key: "dateFilter"});
    this.packageService.getCityFilters();
    this.cityFiltersSubscription = this.packageService.$cities.subscribe(
       (cityFilters) => {
        this.citiesFilter = cityFilters;
      }
    );
    const defaultCity = (await Preferences.get({ key: "selectedCity" })).value;
    if (!defaultCity) {
      setTimeout(() => {
        this.selectedCity = this.citiesFilter[0];
        this.packageService.getFilterPackages(this.nextIndex, this.selectedCity);
        this.nextIndex += 20;
      }, 1000);
    } else {
      this.selectedCity = defaultCity;
      this.packageService.getFilterPackages(this.nextIndex, this.selectedCity);
      this.nextIndex += 20;
    }
    
    this.packagesSubscription = this.packageService.$packages.subscribe(
      async (packages) => {
        if (packages) {
          const shuffledPackages = packages
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)
          this.packages = shuffledPackages;
        }
        await this.loadingService.removeLoading(loading);
      }
    );
  }

  async cityChange(city) {
    this.removeDateFilter()
    this.packages = [];
    // this.infiniteScroll.disabled = false; //volver a activar el scroll loading
    this.nextIndex = 20; //Enseñar de nuevo los primeros 20
    this.selectedCity = city; //Guardar la ciudad seleccionada
    await Preferences.set({ key: "selectedCity", value: this.selectedCity }); //Guardar la ciudad seleccionada en memoria
    if(this.packagesSubscription)this.packagesSubscription.unsubscribe();
    if(this.cityFiltersSubscription)this.cityFiltersSubscription.unsubscribe();
    this.ionContent.scrollToTop(1500);
    await this.ngOnInit();
  }

  async hourChange(hour){
    this.selectedHour = hour;
    if(hour === 'Todos los horarios'){
      this.term = '';
      return;
    }
    this.term = hour;
  }

  async loadData(event) {
    const loading = await this.loadingService.loading();
    await loading.present();
    // console.log(!!this.dateFilter);
    // Check if next to charge are filtered by date
    if(!this.dateFilter){
      this.packageService.getFilterPackages(this.nextIndex, this.selectedCity);
    } else{
      this.packageService.getFilterPackages(this.nextIndex, this.selectedCity, this.dateFilter);
    }
    this.nextIndex += 20;
    if(this.packagesSubscription)this.packagesSubscription.unsubscribe();
    this.packagesSubscription = this.packageService.$packages.subscribe(
      async (packages) => {
        // if (this.packages.length === packages.length) {
        //   this.infiniteScroll.disabled = true; //No intentar cargar más
        // }
        this.packages = packages;
        event.target.complete();
        await this.loadingService.removeLoading(loading);
      }
    );
  }

  async infoButton() {
    const alert = await this.alertController.create({
      header: "Prepara tu experiencia",
      message:
        "Primero selecciona la ciudad, después puedes buscar escribiendo concepto, tipo de música o estilo de comida. Ejemplos: Rooftop - Electrónica - Mariscos",
      buttons: ["¡Entendido!"],
    });

    await alert.present();
  }

  toggleInfiniteScroll() {
    this.infiniteScroll.disabled = !this.infiniteScroll.disabled;
  }

  async onSelectPackage(pack: Package) {
    this.packageService.setPackage(pack.id);
    //console.log("click on :", pack);
    await Preferences.set({ key: "selectedPackage", value: JSON.stringify(pack) });
    await this.navController.navigateForward("/package-detail", {
      animationDirection: "forward",
    });
  }
  
  async introPressed(event){
    Keyboard.hide();
    const loading = await this.loadingService.loading();
    await loading.present();
    await this.loadingService.removeLoading(loading);

  }

  async showCalendar(){
    this.dateFilter = (await Preferences.get({ key: "dateFilter" })).value as string;
    const defaultDate = !this.dateFilter? '' : this.dateFilter;
    let options: CalendarModalOptions;
    if(!this.dateFilter){
     options = {
        title: 'Revisar disponiblidad',
        weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
        color: 'white',
        to: new Date("2025/12/31 18:10:45")

      };
    } else{
      options = {
        title: 'Revisar disponiblidad',
        weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
        color: 'white',
        to: new Date("2025/12/31 18:10:45"),
        defaultDate: defaultDate
      };
    }

    const date: CalendarResult = await this.calendarService.openCalendar(options);

    if(date !== null){
      const loading = await this.loadingService.loading();
      try {
        await loading.present();
        this.packages = [];
        this.nextIndex = 100;
        this.packageService.getFilterPackages(100, this.selectedCity, date.string);
        await Preferences.set({ key: "dateFilter", value:  date.string }); //Guardar la ciudad seleccionada en memoria
        this.dateFilter = date.string;
        await this.loadingService.removeLoading(loading);
      } catch (error) {
        await this.loadingService.removeLoading(loading);
        console.log(error)
      }
    }
  }

  async removeDateFilter(){
    this.dateFilter = '';
    await Preferences.remove({key: "dateFilter"});
    this.ngOnInit();
  }

  async ngOnDestroy() {
    await Preferences.remove({key: "dateFilter"});
    if (this.packagesSubscription) this.packagesSubscription.unsubscribe();
    //await this.packageService.resetPackage();
  }
}
