import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'addr2line-JS';
  translateMe = '';
  translated = '';

  fileChange() {
    console.log('Uploading');
  }

  translate() {
    console.log(`Translating ${this.translateMe}`);
  }
}
