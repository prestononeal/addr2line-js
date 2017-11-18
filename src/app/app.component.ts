import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import 'rxjs/add/operator/map';

const URL = '/api/';

class Translation {
  address: number;
  filename: string;
  function: string;
  line: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private uploader: FileUploader = new FileUploader({url: URL + 'elfs'});
  private title = 'addr2line-JS';
  private translateMe = '';
  private translated = '';
  private elfFileID = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.uploader = new FileUploader({url: URL + 'elfs'});
    this.uploader.onCompleteItem  = (item: any, resp: any, status: any, headers: any) => {
      if (status == 200) {
        resp = JSON.parse(resp);
        this.elfFileID = resp.id;
        console.log('Elf file to use: ', this.elfFileID);
      } else {
        console.log('Error uploading elf file: ', status, resp);
        this.elfFileID = '';
      }
    };
  }

  translate() {
    if (!this.translateMe) {
      this.translated = 'Nothing to translate';
      return;
    } else if (!this.elfFileID) {
      this.translated = 'Please upload an ELF file';
      return;
    } else {
      this.translated = this.translateMe;
    }
    console.log(`Translating ${this.translateMe} with ${this.elfFileID}`);
    let matches = this.translateMe.match(/\b0x[0-9A-F]{8}\b/gi); // Regex to find hex addresses (eg: 0x64033A85)
    console.log('Translating these matches ', matches);
    this.http.get(URL + 'elf/' + this.elfFileID + '/' + matches.join(','))
      .subscribe(resp => {
        let translations = <Translation[]>resp['results'];
        console.log('Got translations: ', translations);
        translations.forEach(tr => {
          // Search and replace each address in the text
          // The signature will look like <file_name>:<line_number> (eg: "my_file.c::133")
          let signature = tr.filename.split('/').slice(-1)[0] + ':' + tr.line.toString();
          let hexAddr = '0x' + tr.address.toString(16);
          console.log(`Replacing ${hexAddr} with ${signature}`);
          // Do a case insensitive replace
          let replaceRegex = new RegExp(hexAddr, 'ig');
          this.translated = this.translated.replace(replaceRegex, signature);
        });
      })
  }
}
