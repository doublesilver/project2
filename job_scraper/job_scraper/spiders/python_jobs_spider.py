import scrapy
from job_scraper.items import JobItem

class PythonJobsSpider(scrapy.Spider):
    name = 'python_jobs'
    allowed_domains = ['python.org']
    start_urls = ['https://www.python.org/jobs/']

    def parse(self, response):
        # Select all job listings on the current page
        jobs = response.css('ol.list-recent-jobs li')

        for job in jobs:
            job_url = job.css('.listing-company-name a::attr(href)').get()
            if job_url:
                # Follow the link to the job details page
                yield response.follow(job_url, self.parse_job)

        # Find and follow the 'next' pagination link
        next_page = response.css('ul.pagination li.next a::attr(href)').get()
        if next_page is not None:
            yield response.follow(next_page, self.parse)

    def parse_job(self, response):
        job_item = JobItem()

        job_item['url'] = response.url

        # Extract title and company from the complex h1 structure
        # The text nodes are separated by a <br> tag
        company_name_parts = response.css('.company-name::text').getall()
        if company_name_parts and len(company_name_parts) >= 2:
            job_item['title'] = company_name_parts[0].strip()
            job_item['company'] = company_name_parts[1].strip()
        else: # Fallback for unexpected structures
            job_item['title'] = response.css('h1.listing-company::text').get(default='').strip()
            job_item['company'] = ''

        # Extract location
        location = response.css('.listing-location a::text').get()
        job_item['location'] = location.strip() if location else ''

        # Extract the full HTML content of the job description
        description = response.css('div.job-description').get()
        job_item['description'] = description if description else ''

        # Only yield the item if we have managed to scrape a title
        if job_item.get('title'):
            yield job_item
